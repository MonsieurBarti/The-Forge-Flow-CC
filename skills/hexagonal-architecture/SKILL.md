---
name: hexagonal-architecture
description: "Use when designing or reviewing system architecture. Hexagonal + DDD + CQRS patterns."
---

# Hexagonal Architecture + DDD + CQRS

Reference implementations:
- https://github.com/MonsieurBarti/claude-nestjs-hexagonal
- https://github.com/Sairyss/domain-driven-hexagon
- https://github.com/MonsieurBarti/backend_test_naboo

---

## 1. Four-Layer Model

```
Presentation → Infrastructure → Application → Domain
                    (inward-only dependencies)

∀ layer L: imports(L) ⊆ inner_layers(L) — NO EXCEPTIONS
```

| Layer          | Depends On              | Never Depends On                |
|----------------|-------------------------|---------------------------------|
| Domain         | nothing (pure)          | App, Infra, Presentation        |
| Application    | Domain                  | Infra, Presentation             |
| Infrastructure | Domain, Application     | Presentation                    |
| Presentation   | Application             | Domain directly, Infra directly |

The dependency arrow always points **inward**. Outer layers know about inner layers; inner layers are oblivious to the outside world.

---

## 2. Domain Layer

The innermost ring. Pure business logic, zero framework dependencies.

**Allowed imports:** `zod`, `node:crypto`, `Result` type — NOTHING else.

### Entities

- Private constructor + public static factory returning `Result<Entity, DomainError>`
- Identity by unique ID (not by attribute equality)
- Encapsulate behavior — ¬anemic (methods mutate internal state, enforce invariants)

```typescript
import { z } from 'zod';
import { Result, ok, err } from '@/shared/result';

const UserPropsSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  createdAt: z.date(),
});
type UserProps = z.infer<typeof UserPropsSchema>;

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: { email: string; name: string }): Result<User, DomainError> {
    const parsed = UserPropsSchema.safeParse({
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      createdAt: new Date(),
    });
    if (!parsed.success) return err(DomainError.validation(parsed.error));
    return ok(new User(parsed.data));
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get name(): string { return this.props.name; }

  rename(newName: string): Result<void, DomainError> {
    const parsed = z.string().min(1).max(255).safeParse(newName);
    if (!parsed.success) return err(DomainError.validation(parsed.error));
    (this.props as any).name = parsed.data;
    return ok(undefined);
  }
}
```

### Value Objects

- Immutable (all fields `readonly`)
- Equality by value (not reference)
- No identity — interchangeable if same value
- Validated at construction via Zod

```typescript
const EmailSchema = z.string().email();

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<Email, DomainError> {
    const parsed = EmailSchema.safeParse(raw);
    if (!parsed.success) return err(DomainError.validation(parsed.error));
    return ok(new Email(parsed.data));
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

### Aggregates

- Cluster of entities + value objects with a single **aggregate root**
- Consistency boundary: ∀ invariants enforced within the aggregate
- External references by ID only — ¬direct object references across aggregates
- One transaction = one aggregate

### Domain Events

- Record what happened (past tense): `UserCreatedEvent`, `OrderPlacedEvent`
- Immutable data carriers — no behavior
- Named `{entity}-{action}.event.ts`

```typescript
export class UserCreatedEvent {
  readonly occurredAt = new Date();
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {}
}
```

### Domain Services

- Business logic that doesn't belong to a single entity
- Stateless — operates on entities/VOs passed in
- Still pure domain: ¬I/O, ¬framework imports

### Repository Ports (Interfaces)

- Defined in domain — implemented in infrastructure
- Named `{aggregate}.repository.ts`
- Return `Result<T, DomainError>` for fallible ops

```typescript
// domain/ports/user.repository.ts
export interface UserRepository {
  findById(id: string): Promise<Result<User | null, DomainError>>;
  save(user: User): Promise<Result<void, DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
}
```

---

## 3. Application Layer — CQRS

Orchestrates domain objects. One service per use case. Depends on domain only.

### Commands (Write Side)

- State-changing operations → return `Result<void, AppError>` or `Result<Id, AppError>`
- Named `{action}-{entity}.command.ts`
- Each command has exactly one handler

```typescript
// application/commands/create-user.command.ts
export class CreateUserCommand {
  constructor(
    readonly email: string,
    readonly name: string,
  ) {}
}

// application/commands/create-user.handler.ts
export class CreateUserHandler {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(cmd: CreateUserCommand): Promise<Result<string, AppError>> {
    const userResult = User.create({ email: cmd.email, name: cmd.name });
    if (!userResult.ok) return err(AppError.fromDomain(userResult.error));

    const saveResult = await this.userRepo.save(userResult.value);
    if (!saveResult.ok) return err(AppError.fromDomain(saveResult.error));

    return ok(userResult.value.id);
  }
}
```

### Queries (Read Side)

- Read-only operations → return data (DTOs, projections)
- Named `{action}-{entity}.query.ts`
- ¬modify state, ¬emit events

```typescript
// application/queries/get-user.query.ts
export class GetUserQuery {
  constructor(readonly userId: string) {}
}

// application/queries/get-user.handler.ts
export class GetUserHandler {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(query: GetUserQuery): Promise<Result<UserDto | null, AppError>> {
    return this.userRepo.findById(query.userId);
  }
}
```

### Application Services

- Thin orchestration layer: validate input → call domain → persist via port
- One public method per use case (or one handler class)
- ¬business logic here — delegate to domain entities/services
- Inject ports (interfaces), ¬concrete implementations

---

## 4. Infrastructure Layer

Implements domain ports with real I/O. Depends on Domain and Application.

### Repository Adapters

- Implement domain port interfaces
- Handle serialization, DB queries, external API calls
- Named `sql-{aggregate}.repository.ts` or `in-memory-{aggregate}.repository.ts`

```typescript
// infrastructure/repositories/sql-user.repository.ts
export class SqlUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(id: string): Promise<Result<User | null, DomainError>> {
    try {
      const row = await this.db.query('SELECT * FROM users WHERE id = $1', [id]);
      if (!row) return ok(null);
      return ok(SqlUserMapper.toDomain(row));
    } catch (e) {
      return err(DomainError.infrastructure('Database query failed'));
    }
  }

  async save(user: User): Promise<Result<void, DomainError>> {
    try {
      const row = SqlUserMapper.toPersistence(user);
      await this.db.query(
        'INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $4',
        [row.id, row.email, row.name, row.createdAt],
      );
      return ok(undefined);
    } catch (e) {
      return err(DomainError.infrastructure('Database write failed'));
    }
  }
}
```

### Data Mappers

- Convert between DB rows and domain entities
- Named `sql-{aggregate}.mapper.ts`
- Use `Entity.reconstitute()` to rebuild domain objects from persistence

```typescript
// infrastructure/mappers/sql-user.mapper.ts
export class SqlUserMapper {
  static toDomain(row: UserRow): User {
    return User.reconstitute({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
    });
  }

  static toPersistence(user: User): UserRow {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.createdAt.toISOString(),
    };
  }
}
```

### External Service Adapters

- Wrap third-party APIs behind domain port interfaces
- Isolate external contracts from domain logic
- Handle retries, timeouts, error mapping at this layer

---

## 5. Presentation Layer

Outermost ring. Entry points, wiring, user-facing I/O.

Depends on **Application only** (invokes commands/queries, ¬touches domain directly).

### Controllers / Resolvers

- Parse incoming request → build Command/Query → delegate to handler → format response
- ¬business logic, ¬direct DB access

### DTOs (Request/Response)

- Zod schemas for request validation
- Separate from domain schemas — presentation concern
- Named `{action}-{entity}.dto.ts`

```typescript
// presentation/dto/create-user.dto.ts
import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const CreateUserResponseSchema = z.object({
  id: z.string().uuid(),
});
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
```

### Exception Filters / Error Mapping

- Map `Result` errors to HTTP status codes (or CLI exit codes)
- Centralized error handling at the presentation boundary
- ¬leak domain error internals to consumers

### Dependency Injection Wiring

- Presentation layer is where DI container lives
- Bind port interfaces → concrete adapters here
- Use Symbol-based DI tokens (¬string tokens)

```typescript
// presentation/di/tokens.ts
export const USER_REPOSITORY = Symbol('UserRepository');

// presentation/di/module.ts
container.bind<UserRepository>(USER_REPOSITORY).to(SqlUserRepository);
```

---

## 6. Validation — Zod Only

- ¬`class-validator`, ¬`class-transformer` — Zod is the single validation library
- Zod schemas = single source of truth for shape + constraints
- `z.infer<typeof Schema>` for all derived types
- Domain validation: in entity factories + value objects
- Presentation validation: in DTOs at the boundary
- ∀ schemas export both the schema and the inferred type

---

## 7. Type Safety

| Rule | Rationale |
|------|-----------|
| ¬`as` casting | Breaks type safety; use type guards or Zod `.parse()` |
| ¬`any` | Use `unknown` + narrowing or generics |
| Symbol-based DI tokens | Type-safe injection, ¬magic strings |
| Generics for collections | `Repository<T>` base when patterns repeat |
| Type guards for narrowing | `function isUser(x: unknown): x is User` |
| Discriminated unions | `{ type: 'success'; data: T } \| { type: 'error'; error: E }` |

```typescript
// Type guard example
function isValidStatus(value: unknown): value is OrderStatus {
  return OrderStatusSchema.safeParse(value).success;
}

// Generic repository port
interface ReadRepository<T, Id = string> {
  findById(id: Id): Promise<Result<T | null, DomainError>>;
  findAll(): Promise<Result<T[], DomainError>>;
}
```

---

## 8. Testing

### Strategy

| Layer          | Test Type   | Dependencies                    |
|----------------|-------------|----------------------------------|
| Domain         | Unit        | None (pure logic)               |
| Application    | Unit        | In-memory adapters for ports    |
| Infrastructure | Integration | Real DB / external services     |
| Presentation   | E2E         | Full stack or supertest         |

### In-Memory Adapters

- Implement the **real** port interface — ¬mocks, ¬stubs
- Deterministic, fast, no I/O
- Named `in-memory-{aggregate}.repository.ts`

```typescript
// infrastructure/repositories/in-memory-user.repository.ts
export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>();

  async findById(id: string): Promise<Result<User | null, DomainError>> {
    return ok(this.store.get(id) ?? null);
  }

  async save(user: User): Promise<Result<void, DomainError>> {
    this.store.set(user.id, user);
    return ok(undefined);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    this.store.delete(id);
    return ok(undefined);
  }
}
```

### Test Colocation

- `user.entity.spec.ts` next to `user.entity.ts`
- `create-user.handler.spec.ts` next to `create-user.handler.ts`
- Test behavior through application services, ¬internal implementation details

---

## 9. Anti-Patterns

| Anti-Pattern | Why It's Wrong | Fix |
|---|---|---|
| **Anemic domain model** | Entities are data bags; logic lives in services | Move behavior into entity methods |
| **Domain imports infra** | Violates dependency rule | Use ports (interfaces in domain) |
| **App layer imports `node:fs`** | Direct I/O coupling | Define a port, inject adapter |
| **`throw` in domain** | Untyped, unchecked error flow | Return `Result<T, E>` |
| **Over-abstraction** | Port for every trivial operation | Abstract only at architectural boundaries |
| **Framework coupling in domain** | Domain tied to NestJS/Express decorators | Domain must be framework-agnostic |
| **Massive inheritance** | Fragile base class, tight coupling | Prefer composition over inheritance |
| **String-based DI tokens** | No type safety, collision risk | Use `Symbol('TokenName')` |
| **Leaking domain types to API** | Coupling consumers to internals | Map to DTOs at presentation boundary |
| **God services** | One service doing everything | One handler per command/query |

---

## 10. Naming Conventions

| Artifact | Pattern | Example |
|---|---|---|
| Entity | `{entity}.entity.ts` | `user.entity.ts` |
| Value Object | `{vo}.value-object.ts` | `email.value-object.ts` |
| Domain Event | `{entity}-{action}.event.ts` | `user-created.event.ts` |
| Repository Port | `{aggregate}.repository.ts` | `user.repository.ts` |
| Repository Adapter | `sql-{aggregate}.repository.ts` | `sql-user.repository.ts` |
| In-Memory Adapter | `in-memory-{aggregate}.repository.ts` | `in-memory-user.repository.ts` |
| Data Mapper | `sql-{aggregate}.mapper.ts` | `sql-user.mapper.ts` |
| Command | `{action}-{entity}.command.ts` | `create-user.command.ts` |
| Command Handler | `{action}-{entity}.handler.ts` | `create-user.handler.ts` |
| Query | `{action}-{entity}.query.ts` | `get-user.query.ts` |
| Query Handler | `{action}-{entity}.handler.ts` | `get-user.handler.ts` |
| DTO | `{action}-{entity}.dto.ts` | `create-user.dto.ts` |
| Domain Service | `{name}.domain-service.ts` | `pricing.domain-service.ts` |
| DI Token | `UPPER_SNAKE` symbol | `USER_REPOSITORY` |

### Directory Structure

```
src/
  {module}/
    domain/
      entities/
      value-objects/
      events/
      ports/
      services/
      errors/
    application/
      commands/
      queries/
      services/
    infrastructure/
      repositories/
      mappers/
      adapters/
    presentation/
      controllers/
      dto/
      filters/
      di/
```

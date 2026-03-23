# Layer Rules — Hexagonal Architecture

Companion to [SKILL.md](./SKILL.md). Quick-reference for layer boundaries.

---

## Dependency Matrix

```
Domain         → nothing (pure, zero external imports beyond zod/crypto/Result)
Application    → Domain only
Infrastructure → Domain, Application (implements ports defined in domain)
Presentation   → Application only (invokes commands/queries, wires DI)
```

**Iron Law:** ∀ import in file F at layer L — the imported module must be at L or an inner layer. Violations are architectural bugs, not style issues.

---

## What Belongs in Each Layer

### Domain

| Belongs | Example |
|---------|---------|
| Entities with behavior | `User` with `rename()`, `deactivate()` methods |
| Value Objects | `Email`, `Money`, `DateRange` |
| Aggregate roots | `Order` containing `OrderLine[]` |
| Domain Events | `UserCreatedEvent`, `OrderPlacedEvent` |
| Domain Services | `PricingService.calculateDiscount(order)` |
| Repository port interfaces | `UserRepository` (interface only, no implementation) |
| Domain Errors | `DomainError.validation()`, `DomainError.notFound()` |
| Zod schemas for domain validation | `UserPropsSchema`, `EmailSchema` |

### Application

| Belongs | Example |
|---------|---------|
| Commands | `CreateUserCommand`, `PlaceOrderCommand` |
| Command Handlers | `CreateUserHandler.execute(cmd)` |
| Queries | `GetUserQuery`, `ListOrdersQuery` |
| Query Handlers | `GetUserHandler.execute(query)` |
| Application Services | `UserService` orchestrating multiple domain operations |
| Application Errors | `AppError.fromDomain()`, `AppError.unauthorized()` |
| Port usage (calling interfaces) | `this.userRepo.save(user)` via injected port |

### Infrastructure

| Belongs | Example |
|---------|---------|
| Repository adapters | `SqlUserRepository implements UserRepository` |
| In-memory adapters | `InMemoryUserRepository implements UserRepository` |
| Data mappers | `SqlUserMapper.toDomain(row)` / `.toPersistence(entity)` |
| External service adapters | `StripePaymentAdapter implements PaymentGateway` |
| Database clients / connections | `DatabaseClient`, connection pool setup |
| File system adapters | `FsFileStorage implements FileStorage` |
| HTTP/API clients | `HttpNotificationAdapter implements NotificationPort` |

### Presentation

| Belongs | Example |
|---------|---------|
| Controllers / resolvers | `UserController.create(req, res)` |
| CLI commands | `CreateUserCliCommand` parsing args → building command |
| Request/Response DTOs | `CreateUserRequestSchema` (Zod), `CreateUserResponse` |
| Exception filters | Map `Result` errors → HTTP 400/404/500 |
| DI container wiring | `container.bind(USER_REPOSITORY).to(SqlUserRepository)` |
| Route definitions | `router.post('/users', controller.create)` |
| Middleware | Auth middleware, request logging |

---

## What Does NOT Belong (Violation Examples)

### Domain Violations

```typescript
// VIOLATION: domain imports infrastructure
import { SqlUserRepository } from '../infrastructure/repositories/sql-user.repository';

// VIOLATION: domain imports node:fs (I/O in pure layer)
import { readFileSync } from 'node:fs';

// VIOLATION: domain uses framework decorators
@Injectable()
export class User { ... }

// VIOLATION: domain throws instead of returning Result
static create(input: UserInput): User {
  if (!input.email) throw new Error('Email required');  // WRONG
}

// VIOLATION: domain imports application layer
import { CreateUserHandler } from '../application/commands/create-user.handler';
```

### Application Violations

```typescript
// VIOLATION: application imports infrastructure
import { SqlUserRepository } from '../infrastructure/repositories/sql-user.repository';

// VIOLATION: application does direct I/O
import { readFile } from 'node:fs/promises';
const config = await readFile('/etc/config.json');

// VIOLATION: application imports presentation
import { CreateUserRequest } from '../presentation/dto/create-user.dto';

// VIOLATION: business logic in application layer (should be in domain)
class CreateUserHandler {
  async execute(cmd: CreateUserCommand) {
    // WRONG: discount logic belongs in domain
    const discount = cmd.orderTotal > 100 ? 0.1 : 0;
  }
}
```

### Infrastructure Violations

```typescript
// VIOLATION: infrastructure imports presentation
import { UserController } from '../presentation/controllers/user.controller';

// VIOLATION: infrastructure contains business logic
class SqlUserRepository implements UserRepository {
  async save(user: User) {
    // WRONG: validation belongs in domain
    if (!user.email.includes('@')) throw new Error('Invalid email');
  }
}
```

### Presentation Violations

```typescript
// VIOLATION: presentation imports domain directly (bypass application)
import { User } from '../domain/entities/user.entity';
const user = User.create({ email, name });
await this.userRepo.save(user);  // WRONG: should go through command handler

// VIOLATION: presentation imports infrastructure directly
import { SqlUserRepository } from '../infrastructure/repositories/sql-user.repository';
const repo = new SqlUserRepository(db);  // WRONG: should use DI

// VIOLATION: business logic in controller
class UserController {
  async create(req) {
    // WRONG: all this belongs in command handler / domain
    if (await this.repo.findByEmail(req.email)) {
      return res.status(409).json({ error: 'Email taken' });
    }
  }
}
```

---

## Import Rules — Quick Check

| If you see this import... | In this layer... | Verdict |
|---|---|---|
| `from '../infrastructure/'` | Domain | VIOLATION |
| `from '../application/'` | Domain | VIOLATION |
| `from '../presentation/'` | Domain | VIOLATION |
| `from '../infrastructure/'` | Application | VIOLATION |
| `from '../presentation/'` | Application | VIOLATION |
| `from '../presentation/'` | Infrastructure | VIOLATION |
| `from '../domain/'` | Presentation | VIOLATION (go through Application) |
| `from '../infrastructure/'` | Presentation | VIOLATION (use DI) |
| `from 'node:fs'` | Domain | VIOLATION |
| `from 'node:fs'` | Application | VIOLATION |
| `from '@nestjs/'` | Domain | VIOLATION |

**Rule of thumb:** If you're importing from an outer layer, you have a dependency inversion problem. Define a port (interface) in the inner layer and implement it in the outer layer.

---

## Test Isolation

Each layer must be testable **independently** without instantiating outer layers.

| Layer | Test Setup | Dependencies |
|---|---|---|
| Domain | Direct instantiation | None — `User.create()` needs no adapters |
| Application | Inject in-memory adapters | `new CreateUserHandler(new InMemoryUserRepository())` |
| Infrastructure | Real DB (test container) | Database, but ¬application, ¬presentation |
| Presentation | Supertest / CLI runner | Full stack or mocked application services |

### Testing Principle

- Domain tests prove **business rules** work
- Application tests prove **use cases** orchestrate correctly with in-memory adapters
- Infrastructure tests prove **adapters** translate correctly (DB, APIs)
- Presentation tests prove **entry points** parse input and return expected output

```typescript
// Application test — fully isolated, no I/O
describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let userRepo: InMemoryUserRepository;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    handler = new CreateUserHandler(userRepo);
  });

  it('should create a user', async () => {
    const result = await handler.execute(
      new CreateUserCommand('john@example.com', 'John'),
    );

    expect(result.ok).toBe(true);
    const saved = await userRepo.findById(result.value);
    expect(saved.value?.email).toBe('john@example.com');
  });
});
```

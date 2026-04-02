import { describe, expect, it } from 'vitest';
import { createProject, ProjectSchema } from './project.js';

describe('Project', () => {
  it('should create a project with name and vision', () => {
    const project = createProject({ name: 'my-app', vision: 'A great app' });
    expect(project.name).toBe('my-app');
    expect(project.vision).toBe('A great app');
    expect(project.id).toBeDefined();
    expect(project.createdAt).toBeInstanceOf(Date);
  });

  it('should create a project without vision', () => {
    const project = createProject({ name: 'my-app' });
    expect(project.name).toBe('my-app');
    expect(project.vision).toBeUndefined();
  });

  it('should validate against schema', () => {
    const project = createProject({ name: 'test', vision: 'test vision' });
    expect(() => ProjectSchema.parse(project)).not.toThrow();
  });

  it('should reject empty name', () => {
    expect(() => createProject({ name: '' })).toThrow();
  });
});

# Contributing to CepatBina

Thank you for your interest in contributing to CepatBina! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment. We expect all contributors to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js v20.12.1 or higher
- npm 10.5.0 or higher
- Git
- A Supabase account (for database)
- A Vercel account (for deployment)

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click the Fork button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Interactive-link.git
   cd Interactive-link
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention

- `feature/description` - For new features
- `fix/description` - For bug fixes
- `docs/description` - For documentation updates
- `refactor/description` - For code refactoring
- `test/description` - For adding or updating tests

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, missing semi-colons, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Example:**
```
feat(domain): add custom domain verification

- Implement DNS verification logic
- Add UI for domain status tracking
- Update API integration

Closes #123
```

## Project Structure

```
Interactive-link/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── utils/           # Utility functions
│   ├── integrations/    # Third-party integrations
│   └── hooks/           # Custom React hooks
├── api/                 # Serverless API functions
├── public/              # Static assets
└── supabase/           # Database migrations
```

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid using `any` type
- Use meaningful variable and function names

### React Best Practices

- Use functional components with hooks
- Keep components small and focused
- Use proper prop typing with TypeScript
- Follow the single responsibility principle

### Styling

- Use TailwindCSS for styling
- Follow the existing design system
- Use shadcn/ui components when available
- Ensure responsive design (mobile-first)

### Code Quality

- Write clean, readable code
- Add comments for complex logic
- Remove unused imports and variables
- Follow the DRY (Don't Repeat Yourself) principle

## Testing Guidelines

### Running Tests

```bash
npm run test          # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
```

### Writing Tests

- Write unit tests for utility functions
- Write integration tests for API endpoints
- Test edge cases and error handling
- Aim for good test coverage

### Test Structure

```typescript
describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Pull Request Process

### Before Submitting

1. **Update your fork**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run quality checks**
   ```bash
   npm run lint
   npm run build
   ```

3. **Test your changes**
   ```bash
   npm run dev
   # Manually test the functionality
   ```

### Creating a Pull Request

1. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create the PR on GitHub**
   - Provide a clear title and description
   - Reference any related issues
   - Add screenshots for UI changes
   - Mark as draft if not ready for review

3. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   How has this been tested?
   
   ## Screenshots
   (if applicable)
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings generated
   - [ ] Tests added/updated
   ```

### Review Process

- All PRs require at least one review
- Address review feedback promptly
- Keep PRs focused and reasonably sized
- Be patient and respectful during reviews

## Issue Reporting

### Creating an Issue

When creating an issue, please include:

1. **Clear title** - Summarize the problem
2. **Description** - Detailed explanation
3. **Steps to reproduce** - For bugs
4. **Expected behavior** - What should happen
5. **Actual behavior** - What actually happens
6. **Environment** - OS, browser, versions
7. **Screenshots** - If applicable

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `question` - Further information requested

## Development Tips

### Debugging

```bash
# Enable verbose logging
npm run dev -- --debug

# Check bundle size
npm run build -- --analyze
```

### Database Migrations

```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

### Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
npm run lint:fix     # Fix linting issues
```

## Questions?

If you have questions:

1. Check existing [documentation](./README.md)
2. Search [existing issues](https://github.com/ArifZakariaLLM/Interactive-link/issues)
3. Create a new issue with the `question` label
4. Reach out to maintainers

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README

Thank you for contributing to CepatBina! 🚀

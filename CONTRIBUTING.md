# Contributing to Compliance Profile Generator

Thank you for your interest in contributing to the Compliance Profile Generator! We welcome contributions from the community.

## Table of Contents

* [Code of Conduct](#code-of-conduct)
* [Getting Started](#getting-started)
* [Development Setup](#development-setup)
* [How to Contribute](#how-to-contribute)
* [Coding Standards](#coding-standards)
* [Testing](#testing)
* [Pull Request Process](#pull-request-process)
* [Reporting Bugs](#reporting-bugs)
* [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

This project is maintained by [Blacksmith InfoSec](https://blacksmithinfosec.com) and we expect all contributors to be respectful and professional. Please be kind and constructive in all interactions.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Submit a pull request

## Development Setup

### Prerequisites

* Node.js (LTS version recommended)
* npm (comes with Node.js)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/compliance-profile-generator.git
cd compliance-profile-generator

# Install dependencies
npm ci

# Start the development server
npm run start
```

### Available Scripts

* `npm run build` - Build for production
* `npm run start` - Start the development server
* `npm run test` - Run test suite
* `npm run test:watch` - Run tests and reload with file changes
* `npm run lint` - Run ESLint

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

* **Bug fixes** - Fix issues reported in GitHub Issues
* **New features** - Add support for additional compliance frameworks, profile templates, or evaluation capabilities
* **Documentation** - Improve README, contribution docs, comments, or usage examples
* **Tests** - Add or improve test coverage for profile generation and compliance evaluation logic
* **Compliance logic improvements** - Improve rule mapping, validation behavior, and profile accuracy
* **UI/UX improvements** - Make profile creation and results interpretation more user-friendly
* **Performance optimizations** - Make compliance profile processing faster and more efficient

### Before You Start

1. Check if there's an existing issue for what you want to work on
2. If not, create an issue describing your proposed changes
3. Wait for feedback before investing significant time
4. For major changes, discuss the approach first

## Coding Standards

### TypeScript/JavaScript

* Use TypeScript for all new code
* Follow the existing code style (enforced by ESLint)
* Use meaningful variable and function names
* Prefer functional programming patterns
* Use React hooks appropriately

### React Components

* Use functional components with hooks
* Keep components small and focused
* Extract reusable logic into custom hooks
* Use proper TypeScript types for props
* Follow accessibility best practices (ARIA labels, semantic HTML)

### Naming Conventions

* **Components**: PascalCase (e.g., `ProfileSummary.tsx`)
* **Utilities**: camelCase (e.g., `profileValidation.ts`)
* **Types**: PascalCase (e.g., `ProfileResult`)
* **Constants**: UPPER\_SNAKE\_CASE (e.g., `MAX_LOGO_SIZE`)

## Testing

### Writing Tests

* Write tests for all new features and bug fixes
* Aim for high test coverage (we use Vitest)
* Test files should be co-located with the code: `component.test.tsx`
* Use descriptive test names that explain what's being tested

### Test Structure

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/file.test.ts

# Generate coverage report
npm test
```

## Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**:
   * Write clean, well-documented code
   * Add tests for new functionality
   * Update documentation as needed

3. **Ensure all checks pass**:
   ```bash
   npm run lint        # Code style
   npm test           # All tests
   npm run build      # Production build
   ```

4. **Commit your changes**:
   * Use clear, descriptive commit messages
   * Reference issue numbers when applicable
   ```bash
   git commit -m "fix: handle revenue thresholds in profile rules (#123)"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Submit a Pull Request**:
   * Fill out the PR template completely
   * Link related issues
   * Provide clear description of changes
   * Include screenshots for UI changes

### PR Review Process

* Maintainers will review your PR
* Address any requested changes
* Once approved, a maintainer will merge your PR
* Your contribution will be included in the next release!

## Reporting Bugs

### Before Submitting a Bug Report

* Check existing issues to avoid duplicates
* Verify you're using the latest version
* Test in a clean browser environment

### How to Submit a Good Bug Report

Include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the behavior
3. **Expected behavior** vs actual behavior
4. **Screenshots** if applicable
5. **Environment details**:
   * Browser and version
   * Operating system
   * Any relevant console errors

## Suggesting Enhancements

We love new ideas! When suggesting enhancements:

1. **Check existing issues** for similar suggestions
2. **Provide clear use case** - explain the problem you're solving
3. **Describe the solution** - what should the feature do?
4. **Consider alternatives** - are there other approaches?
5. **Think about implementation** - is it feasible?

## Security Considerations

### Security-First Development

Since this is a security assessment tool, please:

* **Validate all inputs** - including uploaded logos and framework rule data
* **Sanitize outputs** - prevent XSS in displayed results
* **Consider privacy** - all data should stay local to the browser
* **Review dependencies** - check for known vulnerabilities
* **Follow secure coding practices** - avoid common pitfalls

### Reporting Security Vulnerabilities

**Do not** open public issues for security vulnerabilities. Instead, please see our [SECURITY.md](./SECURITY.md) for responsible disclosure.

## Questions?

* Open an issue for general questions
* Check existing issues and documentation first
* Be patient - this is a community-driven project

## License

By contributing, you agree that your contributions will be licensed under an Apache 2 License.

## Thank You!

Your contributions make this tool better for everyone. We appreciate your time and effort! 🙏

***

Built with ❤️ by [Blacksmith InfoSec](https://blacksmithinfosec.com)

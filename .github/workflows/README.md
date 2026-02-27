# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for automated testing and deployment.

## Workflows

### `test.yml` - Automated Testing

Runs on every push and pull request to `main` and `dev` branches.

**Jobs:**

1. **Backend Tests**
   - Runs on Ubuntu latest
   - Sets up MongoDB and Redis services
   - Installs dependencies
   - Runs Jest tests with coverage
   - Uploads coverage to Codecov

2. **Frontend Tests** (Currently disabled)
   - Will be enabled once Tailwind v4 + Vitest compatibility is resolved
   - Same structure as backend tests

**Services:**
- MongoDB 8.0 (port 27017)
- Redis 7 Alpine (port 6379)

**Environment Variables:**
- `NODE_ENV=test`
- `MONGODB_URI=mongodb://localhost:27017/test-db`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET_KEY=test-jwt-secret-for-ci`

## Status Badges

Add these badges to your README.md:

```markdown
[![Tests](https://github.com/YOUR_USERNAME/proximity-alert-system/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/proximity-alert-system/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/proximity-alert-system/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/proximity-alert-system)
```

Replace `YOUR_USERNAME` with your GitHub username.

## Setting Up Codecov (Optional)

1. Go to [codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add it to GitHub Secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Value: Your Codecov token

**Note:** Codecov is optional. Tests will still run without it, but coverage reports won't be uploaded.

## Local Testing

To test the workflow locally before pushing:

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests (when enabled)
cd frontend
npm test
npm run test:coverage
```

## Troubleshooting

### Tests fail in CI but pass locally

- Check Node.js version matches (20.x)
- Verify MongoDB and Redis services are healthy
- Check environment variables are set correctly

### MongoDB connection issues

- Ensure MongoDB service health check passes
- Verify connection string format
- Check port mapping (27017:27017)

### Redis connection issues

- Ensure Redis service health check passes
- Verify connection string format
- Check port mapping (6379:6379)

## Future Enhancements

- [ ] Add deployment workflow
- [ ] Add linting checks
- [ ] Add security scanning
- [ ] Add performance benchmarks
- [ ] Enable frontend tests when compatibility resolved
- [ ] Add E2E tests with Playwright

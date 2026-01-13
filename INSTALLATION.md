# ESGLend Installation Guide

## Prerequisites

- Node.js 18+ and npm 9+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional but recommended)

## Quick Start (Docker)

```bash
# Clone the repository
cd esglend

# Start all services with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

## Manual Installation

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Seed demo data
python scripts/seed_data.py

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with backend API URL

# Start development server
npm start

# Build for production
npm run build
```

### Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE esglend;
CREATE USER esglend_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE esglend TO esglend_user;

# Enable TimescaleDB extension (optional, for time-series data)
\c esglend
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### Redis Setup

```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## Configuration

### Environment Variables

#### Backend (.env)

```
DATABASE_URL=postgresql://esglend_user:password@localhost:5432/esglend
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
ENVIRONMENT=development
```

#### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

## Running Background Workers

```bash
# Start Celery worker for background tasks
cd backend
celery -A app.celery_worker worker --loglevel=info

# Start Celery beat for scheduled tasks
celery -A app.celery_worker beat --loglevel=info
```

## Demo Data

The application includes demo data for hackathon presentation:

- 10 sample loans with ESG KPIs
- 5 borrower profiles
- Historical ESG performance data
- Sample verification results

To load demo data:

```bash
cd backend
python scripts/seed_data.py
```

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

## Deployment

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Collect static files
cd ../backend
python scripts/collect_static.py

# Run production server with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Docker Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

Access monitoring dashboards:

- Application Metrics: http://localhost:3000/admin/metrics
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Troubleshooting

### Common Issues

**Database connection error**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -l
```

**Redis connection error**
```bash
# Check Redis is running
sudo systemctl status redis

# Test connection
redis-cli ping
```

**Node modules error**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Python dependencies error**
```bash
# Upgrade pip
pip install --upgrade pip

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

## Support

For hackathon-specific questions, contact: shawni@devpost.com

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

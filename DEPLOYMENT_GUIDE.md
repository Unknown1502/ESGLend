# ESGLend - Deployment Guide for Hackathon Submission

## Quick Deployment Options for Judges

For the hackathon submission, you have three main options to provide a clickable URL:

---

## Option 1: Render.com (Recommended - Easiest)

**Advantages:** Free tier, automatic deployments, PostgreSQL included

### Backend Deployment

1. **Create New Web Service**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` directory
   - Configure:
     - **Name:** esglend-backend
     - **Runtime:** Python 3
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Add PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: esglend-db
   - Copy the Internal Database URL
   - Add to backend environment variables as `DATABASE_URL`

3. **Environment Variables**
   ```
   DATABASE_URL=<paste-internal-database-url>
   REDIS_URL=redis://red-xxxxx:6379
   SECRET_KEY=your-secret-key-here
   ENVIRONMENT=production
   ```

4. **Run Database Setup**
   - In Render Shell, run:
     ```bash
     alembic upgrade head
     python scripts/seed_data.py
     ```

### Frontend Deployment

1. **Create Static Site**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Select the `frontend` directory
   - Configure:
     - **Build Command:** `npm install && npm run build`
     - **Publish Directory:** `dist`

2. **Environment Variables**
   ```
   REACT_APP_API_URL=https://esglend-backend.onrender.com
   ```

3. **Your URLs:**
   - Frontend: `https://esglend.onrender.com`
   - Backend API: `https://esglend-backend.onrender.com`

---

## Option 2: Railway.app (Fast & Developer Friendly)

**Advantages:** Simple setup, good free tier, all services in one project

### Deployment Steps

1. **Create New Project** at https://railway.app
2. **Add PostgreSQL** - Click "New" → "Database" → "PostgreSQL"
3. **Deploy Backend:**
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Railway auto-detects Python and deploys
   - Set root directory to `/backend`
   - Add environment variables from DATABASE_URL
4. **Deploy Frontend:**
   - Click "New" → "GitHub Repo"
   - Set root directory to `/frontend`
   - Add build command: `npm run build`
   - Set `REACT_APP_API_URL` to backend URL

### Seed Data
```bash
railway run python scripts/seed_data.py
```

**Your URLs:**
- Frontend: `https://esglend-production.up.railway.app`
- Backend: `https://esglend-backend-production.up.railway.app`

---

## Option 3: Vercel (Frontend) + Render (Backend)

**Advantages:** Best for React apps, fastest deployment

### Frontend on Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Configure:
   - **Framework:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Environment Variable:
   ```
   REACT_APP_API_URL=https://esglend-backend.onrender.com
   ```

### Backend on Render
Follow steps from Option 1 above for backend deployment.

**Your URLs:**
- Frontend: `https://esglend.vercel.app`
- Backend: `https://esglend-backend.onrender.com`

---

## Option 4: Local Deployment with ngrok (Quick Demo)

**Advantages:** Instant, no deployment needed, perfect for quick testing

### Steps

1. **Start your application locally:**
   ```bash
   docker-compose up -d
   docker exec -it esglend_backend python scripts/seed_data.py
   ```

2. **Install ngrok:**
   - Download from https://ngrok.com
   - Sign up for free account
   - Install and authenticate

3. **Expose your frontend:**
   ```bash
   ngrok http 3000
   ```

4. **Get your public URL:**
   - ngrok will provide a URL like: `https://abc123.ngrok.io`
   - This is your clickable prototype URL!

**Note:** This URL is temporary and only works while your computer is running.

---

## Recommended: Configuration Checklist

Before submitting, ensure:

### Backend Checklist
- [ ] Database is created and migrated
- [ ] Seed data is loaded (demo user, loans, borrowers)
- [ ] API endpoints are accessible at `/docs`
- [ ] CORS is configured to allow frontend domain
- [ ] Health check endpoint returns 200 OK

### Frontend Checklist
- [ ] Build completes without errors
- [ ] Environment variable `REACT_APP_API_URL` points to deployed backend
- [ ] Login page loads
- [ ] Can log in with demo@esglend.com / demo123
- [ ] Dashboard displays data from backend
- [ ] All navigation links work

### Testing Your Deployment
Visit these URLs to verify:
1. `https://your-frontend-url.com` - Should show login page
2. `https://your-backend-url.com/health` - Should return {"status": "healthy"}
3. `https://your-backend-url.com/docs` - Should show API documentation
4. Login with demo credentials and navigate through all pages

---

## Demo Credentials for Judges

```
Email: demo@esglend.com
Password: demo123
```

---

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is correct
- Verify Python version is 3.11+
- Check logs: `render logs` or in Render dashboard

### Frontend shows "Network Error"
- Verify REACT_APP_API_URL is set correctly
- Check backend is running and accessible
- Check CORS settings in backend

### Database connection fails
- Ensure DATABASE_URL format: `postgresql://user:password@host:port/database`
- Check database is running
- Verify network connectivity

### Seed data not loading
- Run migrations first: `alembic upgrade head`
- Check database is empty before seeding
- Verify database permissions

---

## Cost Estimate

All recommended options have FREE tiers suitable for hackathon demos:

- **Render:** Free (750 hours/month, PostgreSQL included)
- **Railway:** Free ($5 credit/month, enough for demo)
- **Vercel:** Free (unlimited deployments)
- **ngrok:** Free (1 concurrent tunnel)

---

## Support

If you encounter issues during deployment:
1. Check application logs in your hosting dashboard
2. Verify all environment variables are set
3. Test locally first with Docker
4. Review the INSTALLATION.md for detailed setup

---

## Submission URLs Format

When submitting to the hackathon, provide:

**Live Application URL:**
```
https://esglend.vercel.app
```

**API Documentation:**
```
https://esglend-backend.onrender.com/docs
```

**Demo Credentials:**
```
Email: demo@esglend.com
Password: demo123
```

---

## Next Steps After Deployment

1.  Test all key user flows
2.  Record demo video showing deployed application
3.  Add deployment URL to hackathon submission
4.  Share URL with judges in submission notes
5.  Keep services running during judging period

Good luck with your submission! 

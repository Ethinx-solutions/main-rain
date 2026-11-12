# Second Brain Dashboard

A comprehensive personal knowledge management system built with React, Node.js, and MongoDB. Organize your notes, tasks, links, and daily activities in one beautiful, intuitive interface.

![Second Brain Dashboard](https://via.placeholder.com/800x400/667eea/ffffff?text=Second+Brain+Dashboard)

## ✨ Features

### 📝 Notes Management
- Create, edit, and organize notes with rich text support
- Categorize notes (Personal, Work, Ideas, Learning, Projects)
- Tag system for better organization
- Priority levels and favorites
- Full-text search capabilities
- Archive functionality

### ✅ Task Management
- Create and manage tasks with due dates
- Priority levels (Low, Medium, High, Urgent)
- Task categories and tags
- Subtasks support
- Progress tracking
- Overdue task alerts
- Completion statistics

### 🔗 Link Management
- Save and organize bookmarks
- Automatic metadata extraction
- Category organization
- Click tracking
- Favorite links
- Domain-based grouping

### 📅 Daily View
- Calendar-based navigation
- Daily task overview
- Progress tracking
- Activity summary
- Completed tasks history

### 🎨 Modern UI/UX
- Clean, responsive design
- Dark/Light mode support
- Mobile-friendly interface
- Smooth animations
- Intuitive navigation

### 🔐 Authentication & Security
- Email-based authentication with mandatory email verification
- Real verification emails via Resend (authorised API key) or SMTP
- No auto-verification fallback: accounts stay unverified until the emailed
  link is confirmed; login, documents and AI are gated until then
- JWT token security
- Password reset with hashed, single-use, expiring tokens
- Secure data storage

### 🤖 AI Second Brain (RAG)
- Upload documents (.txt .md .markdown .csv .json .log .pdf .docx)
- Text extraction, chunking with overlap, and metadata
- Embeddings via local Ollama (`nomic-embed-text`) or OpenAI (metered, optional)
- Persistent per-tenant vector storage in MongoDB
- Semantic retrieval and grounded question answering with source citations
- Tenant-isolated by construction: users can only query their own documents
- Cost controls: upload-size cap, per-user document quota, chunk cap,
  request timeouts and bounded retries
- Frontend page: **AI Assistant** (upload, track indexing, ask, view sources)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/second-brain-dashboard.git
cd second-brain-dashboard
```

2. **Install dependencies**
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install
```

3. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

4. **Configure Environment Variables**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/secondbrain

# JWT Secret (generate with: openssl rand -hex 32) - REQUIRED in production
JWT_SECRET=

# Email verification - pick ONE provider
# Resend (authorised API key):
RESEND_API_KEY=
MAIL_FROM=Second Brain <you@your-verified-domain>
# Or classic SMTP:
# MAIL_PROVIDER=smtp
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
# Or MAIL_PROVIDER=none (delivery disabled; accounts stay unverified - no auto-verify)

# URLs
CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development

# AI Second Brain (Ollama is local + free; it must have nomic-embed-text
# and the LLM model pulled: docker exec ethinx-ollama ollama pull nomic-embed-text)
EMBED_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:3b-instruct
```

> ⚠️ Registration no longer returns a session token: accounts are created
> unverified and must be activated via the emailed link before login works.

5. **Start the application**
```bash
# Development mode (runs both server and client)
npm run dev

# Or start separately
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Clone and configure**
```bash
git clone https://github.com/yourusername/second-brain-dashboard.git
cd second-brain-dashboard
cp .env.example .env
# Edit .env with your settings
```

2. **Start with Docker Compose**
```bash
docker-compose up -d
```

3. **Access the application**
- Application: http://localhost:5000

### Manual Docker Build

```bash
# Build the image
docker build -t second-brain .

# Run with external MongoDB
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://your-mongo-host:27017/secondbrain \
  -e JWT_SECRET=your-secret \
  second-brain
```

## ☁️ Cloud Deployment

### Vercel (Frontend + Serverless Functions)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Configure Environment Variables**
Set these in your Vercel dashboard:
- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`

### Netlify (Frontend + Functions)

1. **Build and deploy**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=client/build
```

### Heroku (Full Stack)

1. **Create Heroku app**
```bash
heroku create your-app-name
```

2. **Add MongoDB Atlas**
```bash
heroku addons:create mongolab:sandbox
```

3. **Set environment variables**
```bash
heroku config:set JWT_SECRET=your-secret
heroku config:set EMAIL_HOST=smtp.gmail.com
# ... other variables
```

4. **Deploy**
```bash
git push heroku main
```

### Railway

1. **Connect GitHub repository**
2. **Set environment variables**
3. **Deploy automatically**

## 🛠️ API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/reset-password` - Reset password

### Notes Endpoints
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get single note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Tasks Endpoints
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/status` - Update task status
- `DELETE /api/tasks/:id` - Delete task

### Links Endpoints
- `GET /api/links` - Get all links
- `POST /api/links` - Create link
- `PUT /api/links/:id` - Update link
- `POST /api/links/:id/click` - Record click
- `DELETE /api/links/:id` - Delete link

### Dashboard Endpoints
- `GET /api/dashboard/overview` - Dashboard overview
- `GET /api/dashboard/daily` - Daily view data
- `GET /api/dashboard/analytics/weekly` - Weekly analytics

## 🔧 Configuration

### Email Setup (Gmail)
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_PASS`

### MongoDB Setup
- **Local**: Install MongoDB locally
- **Cloud**: Use MongoDB Atlas (free tier available)
- **Docker**: Use the included docker-compose.yml

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `EMAIL_HOST` | SMTP host | No |
| `EMAIL_PORT` | SMTP port | No |
| `EMAIL_USER` | SMTP username | No |
| `EMAIL_PASS` | SMTP password | No |
| `CLIENT_URL` | Frontend URL | No |
| `PORT` | Server port | No |

## 🧪 Testing

```bash
# Run server tests
npm test

# Run client tests
cd client && npm test

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - Frontend framework
- [Node.js](https://nodejs.org/) - Backend runtime
- [MongoDB](https://www.mongodb.com/) - Database
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide React](https://lucide.dev/) - Icons
- [React Query](https://react-query.tanstack.com/) - Data fetching

## 📞 Support

If you have any questions or need help, please:
1. Check the [Issues](https://github.com/yourusername/second-brain-dashboard/issues) page
2. Create a new issue if your problem isn't already reported
3. Join our [Discord community](https://discord.gg/your-invite)

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Offline support
- [ ] Real-time collaboration
- [ ] Advanced analytics
- [ ] Plugin system
- [ ] Import/Export functionality
- [ ] AI-powered insights
- [ ] Calendar integration

---

**Built with ❤️ by [Your Name](https://github.com/yourusername)**
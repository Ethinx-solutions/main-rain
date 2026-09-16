#!/bin/bash

# Second Brain Dashboard Setup Script
echo "🧠 Setting up Second Brain Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if MongoDB is running (optional)
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found locally. You can use MongoDB Atlas or Docker instead."
fi

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client && npm install
cd ..

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating environment file..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
else
    echo "✅ Environment file already exists."
fi

# Create uploads directory
mkdir -p uploads

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start MongoDB (if using local installation)"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "For production deployment:"
echo "- Docker: 'docker-compose up -d'"
echo "- Vercel: 'vercel --prod'"
echo "- Heroku: Follow the README instructions"
echo ""
echo "Happy organizing! 🚀"
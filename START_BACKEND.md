# How to Start the Backend Server

## Quick Start

1. **Open a terminal in the backend folder:**
   ```bash
   cd backend
   ```

2. **Start the backend server:**
   ```bash
   npm start
   ```
   or
   ```bash
   node index.js
   ```

3. **Make sure MongoDB is running:**
   - If you have MongoDB installed locally, make sure it's running
   - The server will connect to MongoDB automatically

4. **You should see:**
   ```
   Server is running on port 3000
   ```

5. **Keep this terminal open** - the server needs to keep running for the frontend to work.

## Troubleshooting

- **Port 3000 already in use:** Change the PORT in `.env` file or stop the process using port 3000
- **MongoDB connection error:** Make sure MongoDB is installed and running
- **Cannot connect to server error in frontend:** Make sure the backend server is running on port 3000


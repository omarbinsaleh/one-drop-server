# One Drop - Server

This is the backend server for the One Drop application, a blood donation platform that connects donors with recipients. The server is built using Node.js, Express, and MongoDB.

## API
[API Base URL](#) (https://one-drop-server.vercel.app/)

## Features
- User authentication and management
- Role-based access control (Admin, Donor, etc.)
- CRUD operations for users, donation requests, blogs, districts, and upazilas
- Middleware for user validation and admin authorization
- Secure database interactions with MongoDB
- CORS support for frontend integration

## Technologies Used
- **Backend Framework:** Express.js
- **Database:** MongoDB (MongoDB Atlas)
- **Middleware:** CORS, dotenv
- **Authentication & Authorization:** Role-based access control

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/omarbinsaleh/one-drop-server.git
   cd one-drop-server
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:
   ```env
   PORT=5000
   DB_USERNAME=your_mongodb_username
   DB_PASSWORD=your_mongodb_password
   ```

4. Start the server:
   ```sh
   npm start
   ```

## API Endpoints

### User Routes
- `POST /users` - Create a new user
- `PATCH /users` - Update an existing user
- `PATCH /users/update/:id` - Update a single user (Admin only)
- `GET /users` - Retrieve users
- `GET /users/:id` - Retrieve a specific user by ID

### Donation Requests Routes
- `POST /donation-requests` - Create a new donation request
- `GET /donation-requests/:id` - Retrieve a single donation request
- `GET /donation-requests` - Retrieve all donation requests
- `PATCH /donation-requests/:id` - Update a donation request
- `DELETE /donation-requests/:id` - Delete a donation request

### Blog Routes
- `POST /blogs` - Create a new blog
- `GET /blogs` - Retrieve all blogs
- `GET /blogs/:id` - Retrieve a blog by ID
- `PATCH /blogs/:id` - Update a blog
- `DELETE /blogs/:id` - Delete a blog

### Districts & Upazilas Routes
- `GET /districts` - Retrieve all districts
- `GET /districts/:id` - Retrieve a specific district
- `GET /upazilas` - Retrieve all upazilas
- `GET /upazilas/:id` - Retrieve a specific upazila

## Middleware
- `validateExistingUser` - Checks if a user already exists before creating/updating
- `isAdmin` - Restricts access to admin-only routes

## Deployment
This server can be deployed on any cloud platform like:
- **Heroku**
- **Vercel**
- **Render**
- **AWS EC2**

## License
This project is licensed under the MIT License.

---
### Author
Developed by **[Your Name]**


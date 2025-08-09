# Student Transportation Backend

A backend API for a student transport solution system — similar to Uber/Bolt but designed for campus rides.  
Built with **Node.js**, **Express**, **Prisma**, and **MySQL**.

---

## Features
- **Authentication** with JWT (Student, Driver, Admin roles)
- Students can request rides
- Drivers can accept rides
- Ride status tracking (`PENDING`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- Role-based access control

---

## Tech Stack
- **Node.js** + **Express**
- **Prisma ORM**
- **MySQL**
- **JWT Authentication**
- **Nodemon** for development

---

## Project Structure
.
├── app.js # Express app setup
├── server.js # Server start file
├── prisma/
│   ├── schema.prisma # Prisma schema
│   └── migrations/ # Database migrations
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── rides.routes.js
├── middleware/
│   └── auth.js
├── prismaClient.js # Prisma client setup
├── .env # Environment variables
└── docs/
    └── postman-guide.md # API testing guide

---

## Getting Started

### Clone & Install
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
npm install
```

### Setup Environment
Create `.env` file:

```env
DATABASE_URL="mysql://user:password@localhost:3306/transport"
JWT_SECRET="yoursecretkey"
PORT=5000
```

### Database Migration
```bash
npx prisma migrate dev
```

### Start Server
```bash
npx nodemon server.js
```

---

## API Documentation
See `docs/postman-guide.md` for a step-by-step Postman guide.

---

## Testing the Flow
1. Login as Student → Get token  
2. Request a Ride  
3. Login as Driver → Accept Ride  
4. View Ride Details  
5. Update Ride Status  

---

---

# **docs/postman-guide.md**

## Postman Testing Guide

This guide explains how to test the Student Transport Backend using **Postman**.

---

## Prerequisites
- Server running:
```bash
npx nodemon server.js
```
- Database migrations applied:
```bash
npx prisma migrate dev
```
- At least one Student, Driver, and (optionally) Admin account created.

---

## Login as Student
**POST** `/login`  
**Body:**
```json
{
  "email": "student@example.com",
  "password": "123456"
}
```
**Response:**
```json
{
  "token": "<jwt_token>"
}
```
Copy the token for later steps.

---

## Request a Ride (Student)
**POST** `/rides/request`  
**Headers:**
```
Authorization: Bearer <student_token>
```
**Body:**
```json
{
  "pickup": "School Gate",
  "destination": "Library"
}
```
**Response:**
```json
{
  "message": "Ride requested successfully",
  "ride": {
    "id": 1,
    "studentId": 2,
    "pickup": "School Gate",
    "destination": "Library",
    "status": "PENDING"
  }
}
```
➡ Save the `ride.id` for later.

---

## Login as Driver
**POST** `/login`  
**Body:**
```json
{
  "email": "driver@example.com",
  "password": "123456"
}
```
Copy the token.

---

## Accept Ride (Driver)
**POST** `/rides/accept`  
**Headers:**
```
Authorization: Bearer <driver_token>
```
**Body:**
```json
{
  "rideId": 1
}
```
**Response:**
```json
{
  "message": "Ride accepted",
  "ride": {
    "id": 1,
    "driverId": 3,
    "status": "ACCEPTED"
  }
}
```

---

## Get Ride Details
**GET** `/rides/1`  
**Headers:**
```
Authorization: Bearer <any_valid_token>
```
Response: Includes ride info plus student & driver details.

---

## Update Ride Status
**PUT** `/rides/1/status`  
**Headers:**
```
Authorization: Bearer <driver_token>
```
**Body:**
```json
{
  "status": "COMPLETED"
}
```
Valid statuses:
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

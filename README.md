# QueueLess - Virtual Queue Management System

QueueLess is a modern, real-time queue management solution designed to eliminate physical waiting lines. It allows businesses to manage customer flow digitally and lets customers join queues remotely via QR codes, receiving live updates on their wait times.

## 🚀 Vision

**"Eliminate Lines. Forever."**
We empower businesses to operate more efficiently and give customers back their time. No more standing in line—scan, join, and relax.

## ✨ Key Features

### For Businesses
*   **Real-time Dashboard**: Monitor active queues, see customer details, and manage flow.
*   **Service Management**: Add, edit, or remove services with custom durations and costs.
*   **Smart Scheduling**: Set operating hours and closed days; the system automatically prevents bookings outside these times.
*   **QR Code Generator**: Instantly generate and print a unique QR code flyer for your storefront.
*   **Queue Control**: Mark customers as "Completed" or "Cancelled" with a single click.

### For Customers
*   **Scan & Join**: No app download required. simply scan a QR code to enter the queue.
*   **Live Updates**: See "People Ahead" and "Estimated Wait Time" in real-time (powered by Socket.io).
*   **Browser Notifications**: Get notified instantly when it's your turn.
*   **Queue History**: View past visits and services.
*   **Profile Management**: Update contact details and manage account settings.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / Radix UI
-   **Icons**: [Lucide React](https://lucide.dev/)

### Backend
-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express.js](https://expressjs.com/)
-   **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
-   **Real-time**: [Socket.io](https://socket.io/)
-   **Authentication**: JWT (JSON Web Tokens) & Bcrypt

## ⚙️ Installation & Setup

Follow these steps to run QueueLess locally.

### Prerequisites
-   Node.js (v18+)
-   MongoDB (Running locally or MongoDB Atlas URI)

### 1. Clone the Repository
```bash
git clone https://github.com/M-ayank2005/Queueless.git
cd Queueless
```

### 2. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/queueless  # Or your Atlas URI
JWT_SECRET=your_super_secret_key_change_this
```

Start the backend server:
```bash
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend folder, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend application:
```bash
npm run dev
# App runs on http://localhost:3000
```

## 📖 Usage Guide

### As a Business
1.  Navigate to `http://localhost:3000`.
2.  Click **"Get Started for Business"** and register your shop.
3.  Go to the **Dashboard**.
4.  Add your services (e.g., "Haircut - 30 mins").
5.  Go to **Settings** and set your **Working Hours**.
6.  Click **"Download / Print"** on the QR Card to get your signage.

### As a Customer
1.  Scan the business's QR code (or use the simulated link from the print view).
2.  Register or Login.
3.  Select a service and click **"Join Queue"**.
4.  Watch the live timer. You can close the tab; your spot is saved.
5.  Receive a notification when it's your turn!

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

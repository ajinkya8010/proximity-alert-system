import express from 'express';
import { loginUser, logoutUser, registerUser } from '../controllers/auth.controller.js'; 

const router = express.Router();

// Define the route for user registration
router.post('/register', registerUser); 
router.post('/login', loginUser);
router.post('/logout',logoutUser)

export default router;
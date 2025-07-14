import express from "express";
import connectDB from "./mongoose/connection.js"
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors" ;


dotenv.config({
    path: './.env'
})


const app = express();
const PORT = process.env.PORT || 3001;


app.use(cors({
  origin: "*",
  credentials: false
}));


app.use(express.json());
app.use(cookieParser());


connectDB()
.then(()=>{
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
}).catch((err)=>{
    console.log("MONGODB connection failed!!! ",err)
})


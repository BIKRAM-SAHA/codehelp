require("dotenv").config();
const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middleware/errorMiddleware");
const connection = require("./database/db");
const teacherRoute = require("./routes/teacherRoute");
const userRoute = require("./routes/userRoutes");
const agoraRoute = require("./routes/agoraRoute");
const paymentRoute = require("./routes/paymentRoute");
const questionRoute = require("./routes/ratingRoute");
// FOR PAYMENT GATWAY
const path = require("path");
const shortid = require("shortid");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_test_35zy3Hqp4Jtv6M",
  key_secret: "0LDDihu5S8UgdBS4o6KvL4Fj",
});

const port = 5000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

// app.get("/", (req, res) => {
//   res.send("hello!!!!");
// });

app.use("/teacher", teacherRoute);
app.use("/user", userRoute);
app.use("/agora", agoraRoute);
app.use("/payment", paymentRoute);
app.use("/ask", questionRoute);

//catch all route for frontend
app.use(express.static(path.join(__dirname, "./frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve("./frontend/build", "index.html"));
});

app.use(errorMiddleware);

connection();

const server = app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", async (socket) => {
  let studentId;
  let question;
  let teacherId;
  // let tutorsVisited;

  //if conn with a student socket
  socket.on("studentConnected", (payload) => {
    studentId = payload.studentId;
    socket.join(studentId);
  });
  socket.on("questionAsked", (payload) => {
    question = payload.question;
    studentId = payload.studentId;
    console.log(`question asked by ${studentId}: ${question}`);
    socket.to("tutors").emit("questionAvailable", { studentId, question });
  });

  //if conn with a teacher socket
  socket.on("teacherOnline", (payload) => {
    console.log("teacher ", teacherId, " is online");
    teacherId = payload.teacherId;
    socket.join(teacherId);
    socket.join("tutors");
  });
  socket.on("questionAccepted", (payload) => {
    studentId = payload.studentId;
    teacherId = payload.teacherId;
    io.to("tutors").emit("removeQuestion", { studentId });
    io.to(studentId).to(teacherId).emit("moveToCall", { studentId, teacherId });
    // socket.to(teacherId).emit("moveToCall", { studentId, teacherId });
  });
});

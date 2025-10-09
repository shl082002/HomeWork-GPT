import express from "express";
import { User } from "../../src/db/models/user.model";
import bcrypt from "bcrypt";
const router = express.Router();

//Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Name, email and password is required",
    });
  }

  try {
    //Check if User already exist
    const isUserExist = await User.findOne({ email });
    if (isUserExist) {
      return res.status(409).json({
        message: "User already exists",
      });
    }
    //Hash the password
    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);
    const payload = {
      name,
      email,
      password: hashedPassword,
    };
    const userData = await User.create(payload);
    return res.status(201).json({
      message: "User created",
      userData,
    });
  } catch (err) {
    return res.status(500).json(err);
  }
});

//Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      message: "Email and Password is required",
    });
  }
  try {
    const ifUser = await User.findOne({ email });
    if (!ifUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, ifUser.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid Password",
      });
    }
    return res.status(200).json(ifUser);
  } catch (err) {
    return res.status(500).json({
      err,
    });
  }
});

export default router;

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// ====== MongoDB Connection ======
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/leaveboard";

await mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log("✅ Connected to MongoDB");

// ====== User Schema ======
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  position: String,
  team: String,
  office: String,
  country: String,
  wfhWeekly: Number,
  leaveCounts: {
    sickLeave: Number,
    timeOff: Number,
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
}, {
    collection: 'user'
  }
);

const User = mongoose.model("User", userSchema);

// ====== Create Admin User ======
const createAdminUser = async () => {
  try {
    const password = "123456"; // plain password
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const adminUser = new User({
      _id: new mongoose.Types.ObjectId(), // generates a valid ObjectId
      name: "admin",
      email: "email@digithaileaveboard.com",
      password: hash,
      role: "admin",
      position: "CEO",
      team: "Executives",
      office: "Bangkok",
      country: "Thailand",
      wfhWeekly: 1,
      leaveCounts: { sickLeave: 15, timeOff: 15 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully:");
    console.log(adminUser);
  } catch (err) {
    console.error("❌ Error creating admin user:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

await createAdminUser();
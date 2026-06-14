const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // Drop the old index if it exists to allow the new partial index to be created
    try {
      if (mongoose.connection && mongoose.connection.db) {
        await mongoose.connection.db.collection("weekmaterials").dropIndex("subject_1_week_1_type_1");
        console.log("Dropped old unique index subject_1_week_1_type_1");
      }
    } catch (e) {
      // Index might not exist, which is fine
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;

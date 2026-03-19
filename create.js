const dns = require('dns');
require('dotenv').config();
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());

const uri=process.env.MONGO_URI
mongoose.connect(uri)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.log("Connection error:", err));

const feedbackSchema = new mongoose.Schema({
  feedbackQuestion: String,
  positive: String,
  negative: String,
  ratingType: String,
  selectedRating: Number,

  feedbackTiming: {
    type: {
      type: String
    }
  },

  preview: {
    spent: String,
    date: String,
    time: String
  },

  categories: [
    {
      name: String,
      selected: Boolean
    }
  ],

  askCustomers: {
    options: [
      {
        name: String,
        selected: Boolean
      }
    ]
  },

  reward: {
    enabled: Boolean,
    points: Number
  },
  whatsappNumber: {
  type: String,
  match: [/^[0-9]{10,15}$/, "Invalid WhatsApp number"]
},
phoneNumber: {
  type: String,
  match: [/^[0-9]{10,15}$/, "Invalid phone number"]
},
email: {
  type: String,
  lowercase: true,
  trim: true,
  match: [/^\S+@\S+\.\S+$/, "Invalid email"]
}

}, { timestamps: true });
const Feedback = mongoose.model("Feedback", feedbackSchema);

// app.post("/feedback", async (req, res) => {
//   try {
//     console.log("======= RECEIVED JSON =======");
//     console.log(JSON.stringify(req.body, null, 2));
//     console.log("=============================");

//     const newFeedback = await Feedback.create(req.body);

//     res.status(201).json({
//       message: "Feedback saved successfully",
//       data: newFeedback
//     });

//   } catch (error) {
//     console.error("Save error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });
app.post("/feedback", async (req, res) => {
  try {
        console.log("======== INCOMING REQUEST ========");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("==================================");
    const { _id, ...data } = req.body;

    let feedback;

    if (_id) {
      // Update existing document
      feedback = await Feedback.findOneAndUpdate(
        { _id },
        { $set: data },
        { returnDocument: "after" }
      );
    } else {
      // Create new document
      feedback = await Feedback.create(data);
    }

    res.status(200).json(feedback);
    // console.log("Sending ID:", storedId);

  } catch (err) {
    console.error("Feedback save error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/data-packet", (req, res) => {
  const { whatsapp, sms, email } = req.body;

  console.log("WhatsApp:", whatsapp);
  console.log("SMS:", sms);
  console.log("Email:", email);

  // if (!whatsapp && !sms && !email) {
  //   return res.status(400).json({
  //     message: "At least one contact method is required"
  //   });
  // }

  res.status(200).json({
    message: "Data received successfully",
    data: { whatsapp, sms, email }
  });
});
app.get("/test",async(res,seq)=>{
  console.log("======== INCOMING REQUEST ========");
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("==================================");
});


app.post("/api/feedback-channels", async (req, res) => {
  const { whatsapp, sms, email } = req.body;

  const results = {};

  try {

    /* ================= WHATSAPP ================= */
    if (whatsapp) {
      console.log(whatsapp)
      try {
        const waResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: whatsapp,
            type: "text",
            text: {
              body: "Here is your feedback link: https://yourlink.com"
            }
          },
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );

        results.whatsapp = {
          success: true,
          data: waResponse.data
        };

      } catch (error) {
        results.whatsapp = {
          success: false,
          error: error.response?.data || error.message
        };
      }
    }

    /* ================= SMS (MSG91) ================= */
    if (sms) {
      console.log(sms)
      try {
        const smsResponse = await axios.post(
          "https://control.msg91.com/api/v5/flow/",
          {
            template_id: TEMPLATE_ID,
            short_url: "0",
            recipients: [
              {
                mobiles: sms, // Example: 919876543210
                var1: "https://yourlink.com"
              }
            ]
          },
          {
            headers: {
              authkey: MSG91_AUTH_KEY,
              "Content-Type": "application/json"
            }
          }
        );

        results.sms = {
          success: true,
          data: smsResponse.data
        };

      } catch (error) {
        results.sms = {
          success: false,
          error: error.response?.data || error.message
        };
      }
    }

    /* ================= EMAIL (AWS SES) ================= */
    if (email) {
      console.log(email)
      try {
        const command = new SendEmailCommand({
          Source: process.env.SES_VERIFIED_EMAIL,
          Destination: {
            ToAddresses: [email],
          },
          Message: {
            Subject: {
              Data: "Your Feedback Link",
            },
            Body: {
              Text: {
                Data: "Here is your feedback link: https://yourlink.com",
              },
            },
          },
        });

        const emailResponse = await sesClient.send(command);

        results.email = {
          success: true,
          messageId: emailResponse.MessageId
        };

      } catch (error) {
        results.email = {
          success: false,
          error: error.message
        };
      }
    }

    /* ================= FINAL RESPONSE ================= */
    res.status(200).json({
      success: true,
      message: "Selected channels processed",
      results
    });

  } catch (error) {
    console.error("Unexpected Server Error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
app.post("/feedback", async (req, res) => {
  try {
        console.log("======== INCOMING REQUEST ========");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("==================================");
    const { _id, ...data } = req.body;

    let feedback;

    if (_id) {
      // Update existing document
      feedback = await Feedback.findOneAndUpdate(
        { _id },
        { $set: data },
        { returnDocument: "after" }
      );
    } else {
      // Create new document
      feedback = await Feedback.create(data);
    }

    res.status(200).json(feedback);
    console.log("Sending ID:", storedId);

  } catch (err) {
    console.error("Feedback save error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/whatsapp", async (req, res) => {
  try {
    console.log("Incoming:", req.body);

    const {
      whatsappNumber,
      phoneNumber,
      email,
      message
    } = req.body;

    // Basic validation
    if (!whatsappNumber || !message) {
      return res.status(400).json({
        message: "WhatsApp number and message are required"
      });
    }

    // Save separately (optional)
    const newEntry = new Feedback({
      whatsappNumber,
      phoneNumber,
      email,
      feedbackQuestion: message // reuse field OR create new schema later
    });

    const savedData = await newEntry.save();

    res.status(200).json({
      message: "WhatsApp request received",
      data: savedData
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error processing WhatsApp request",
      error: error.message
    });
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
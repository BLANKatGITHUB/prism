import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import fs from "fs";
import multer from "multer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const systemIns = fs.readFileSync("system-instructions.txt", "utf-8");

const upload = multer({ dest: "uploads/" });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile("index.html");
});

app.post("/generate_text_output", upload.none(), async (req, res) => {
  try {
    const inputText = req.body["input-text"];
    if (!inputText) {
      return res.status(400).send("Input text is required");
    }
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: inputText,
      config: {
        systemInstruction: systemIns,
      },
    });
    res.json({ content: response.text });
  } catch (error) {
    console.error("Error generating output:", error);
    res.status(500).send("Error generating output");
  }
});

app.post(
  "/generate_img_output",
  upload.single("input-file"),
  async (req, res) => {
    try {
      const inputText = req.body["input-text"] || "";
      const inputFile = req.file;

      if (!inputText && !inputFile) {
        return res.status(400).send("file is required");
      }

      if (inputFile && inputFile.originalname) {
        const fileExtension = inputFile.originalname
          .split(".")
          .pop()
          .toLowerCase();
        if (
          fileExtension !== "jpeg" &&
          fileExtension !== "jpg" &&
          fileExtension !== "png"
        ) {
          return res.status(400).send("Only JPEG files are supported");
        }
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });

      let myfile;
      if (inputFile) {
        try {
          myfile = await ai.files.upload({
            file: inputFile.path,
            config: { mimeType: "image/jpeg" },
          });
        } catch (uploadError) {
          console.error("Error uploading file to Google GenAI:", uploadError);
          return res.status(500).send("Error uploading file to Google GenAI");
        }
      }

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: createUserContent([
            ...(myfile ? [createPartFromUri(myfile.uri, myfile.mimeType)] : []),
            inputText,
          ]),
          config: {
            systemInstruction: systemIns,
          },
        });
      } catch (generationError) {
        console.error("Error generating content:", generationError);
        return res.status(500).send("Error generating content");
      }

      res.json({ content: response.text });

      if (inputFile) {
        fs.unlink(inputFile.path, (err) => {
          if (err) {
            console.error("Error deleting temporary file:", err);
          } else {
            console.log("Temporary file deleted successfully.");
          }
        });
      }
    } catch (error) {
      console.error("Error generating output:", error);
      res.status(500).send("Error generating output");
    }
  }
);

app.post(
  "/generate_pdf_output",
  upload.single("input-file"),
  async (req, res) => {
    try {
      const inputText = req.body["input-text"] || "";
      const inputFile = req.file;

      if (!inputText && !inputFile) {
        return res.status(400).send("Input text or file is required");
      }

      if (inputFile && inputFile.originalname) {
        const fileExtension = inputFile.originalname
          .split(".")
          .pop()
          .toLowerCase();
        if (fileExtension !== "pdf") {
          return res.status(400).send("Only PDF files are supported");
        }
      }
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });

      let myfile;
      if (inputFile) {
        try {
          myfile = await ai.files.upload({
            file: inputFile.path,
            config: {
              mimeType: "application/pdf",
            },
          });
        } catch (uploadError) {
          console.error("Error uploading file to Google GenAI:", uploadError);
          return res.status(500).send("Error uploading file to Google GenAI");
        }
      }
      if (myfile) {
        try {
          let getFile = await ai.files.get({ name: myfile.name });
          while (getFile.state === "PROCESSING") {
            console.log("File is still processing...");
            getFile = await ai.files.get({ name: myfile.name });
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
          if (getFile.state === "FAILED") {
            console.error("File processing failed:", getFile);
            return res.status(500).send("Error processing file");
          }
        } catch (error) {
          console.error("Error getting file status:", error);
          return res.status(500).send("Error getting file status");
        }
      }
      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: createUserContent([
            ...(myfile ? [createPartFromUri(myfile.uri, myfile.mimeType)] : []),
            inputText,
          ]),
          config: {
            systemInstruction: systemIns,
          },
        });
      } catch (generationError) {
        console.error("Error generating content:", generationError);
        return res.status(500).send("Error generating content");
      }
      res.json({ content: response.text });

      if (inputFile) {
        fs.unlink(inputFile.path, (err) => {
          if (err) {
            console.error("Error deleting temporary file:", err);
          } else {
            console.log("Temporary file deleted successfully.");
          }
        });
      }
    } catch (error) {
      console.error("Error generating output:", error);
      res.status(500).send("Error generating output");
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

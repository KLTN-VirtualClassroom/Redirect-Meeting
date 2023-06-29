import express from "express";
import { google } from "googleapis";
import { v4 as uuid } from "uuid";
import path from "path";
import dayjs from "dayjs";
import dotenv from "dotenv";
import cors from "cors";
import { authenticate } from "@google-cloud/local-auth";
import fs from "fs";
dotenv.config({});

// const calendar = google.calendar({
//   version: "v3",
//   auth: process.env.API_KEY,
// });

const app = express();
app.use(cors());

const PORT = process.env.NODE_ENV || 8000;

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);

const scopes = ["https://www.googleapis.com/auth/calendar"];

const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: scopes,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function addEvent(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  let meetingLink = "";
  await calendar.events.insert(
    {
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: "Contemporary Meeting",
        description: "Video Meet",
        start: {
          dateTime: dayjs(new Date()),
          timeZone: process.env.TIME_ZONE,
        },
        end: {
          dateTime: dayjs(new Date()).add(2, "hour"),
          timeZone: process.env.TIME_ZONE,
        },
        conferenceData: {
          createRequest: {
            requestId: uuid(),
          },
        },
        attendees: [
          {
            email: "tl354663@gmail.com",
          },
        ],
      },
    },
    function (err, event) {
      if (err) {
        console.log(
          "There was an error contacting the Calendar service: " + err
        );
        return {
          msg: "There was an error contacting the Calendar service: " + err,
        };
        return;
      }
      console.log("Event created: %s", event.data.hangoutLink);
      meetingLink = event.data.hangoutLink;
      return {
        msg: meetingLink,
      };
    }
  );
}

app.get("/schedule_event", async (req, res) => {
  const teacherEmail = req.query.email;
  authorize().then(async (auth) => {
    const calendar = google.calendar({ version: "v3", auth });

    let meetingLink = "";

    await calendar.events.insert(
      {
        calendarId: "primary",
        conferenceDataVersion: 1,
        requestBody: {
          summary: "Contemporary Meeting",
          description: "Video Meet",
          start: {
            dateTime: dayjs(new Date()),
            timeZone: process.env.TIME_ZONE,
          },
          end: {
            dateTime: dayjs(new Date()).add(2, "hour"),
            timeZone: process.env.TIME_ZONE,
          },
          conferenceData: {
            createRequest: {
              requestId: uuid(),
            },
          },
          attendees: [
            {
              email: teacherEmail,
            },
          ],
        },
      },
      function (err, event) {
        if (err) {
          console.log(
            "There was an error contacting the Calendar service: " + err
          );
          res.send({
            msg: "There was an error contacting the Calendar service: " + err,
          });
          return;
        }
        console.log("Event created: %s", event.data.hangoutLink);
        meetingLink = event.data.hangoutLink;
        res.send({
          msg: meetingLink,
        });
      }
    );
  });
});

app.get("/re-authenticate", (req, res) => {
  fs.exists("./token.json", function (exists) {
    console.log(exists);
    if (exists) {
      //Show in green
      fs.unlink("./token.json", function (err) {
        if (err) return console.log(err);
        console.log("file deleted successfully");
        res.json({
          msg: "File deleted successfully",
        });
      });
    } else {
      //Show in red
      console.log("not exist file");
      res.json({
        msg: "File not exist",
      });
    }
  });
  authorize()
});

// app.get("/google", (req, res) => {
//   const url = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: scopes,
//   });
//   res.redirect(url);
// });

// app.get("/google/redirect", async (req, res) => {
//   const code = req.query.code;

//   const { tokens } = await oauth2Client.getToken(code);
//   console.log(tokens);

//   oauth2Client.setCredentials(tokens);
//   // res.redirect("http://localhost:8000/schedule_event");

//   res.send({ msg: "Credentials have been authorized" });
// });

// app.get("/schedule_event", async (req, res) => {
//   let meetingLink = "";

//   await calendar.events.insert(
//     {
//       calendarId: "primary",
//       auth: oauth2Client,
//       conferenceDataVersion: 1,
//       requestBody: {
//         summary: "Contemporary Meeting",
//         description: "Video Meet",
//         start: {
//           dateTime: dayjs(new Date()),
//           timeZone: process.env.TIME_ZONE,
//         },
//         end: {
//           dateTime: dayjs(new Date()).add(2, "hour"),
//           timeZone: process.env.TIME_ZONE,
//         },
//         conferenceData: {
//           createRequest: {
//             requestId: uuid(),
//           },
//         },
//         attendees: [
//           {
//             email: "tl354663@gmail.com",
//           },
//         ],
//       },
//     },
//     function (err, event) {
//       if (err) {
//         console.log(
//           "There was an error contacting the Calendar service: " + err
//         );
//         res.send({
//           msg: "There was an error contacting the Calendar service: " + err,
//         });
//         return;
//       }
//       console.log("Event created: %s", event.data.hangoutLink);
//       meetingLink = event.data.hangoutLink;
//       res.send({
//         msg: meetingLink,
//       });
//     }
//   );
// });

app.listen(PORT, () => {
  console.log("Server started on port ", PORT);
});

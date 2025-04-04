import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Create a reusable transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send an email
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    // console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

// import { config } from "../config/app.config";
// import { resend } from "./resendClient";

// type Params = {
//   to: string | string[];
//   subject: string;
//   text: string;
//   html: string;
//   from?: string;
// };

// const mailer_sender =
//   config.NODE_ENV === "development"
//     ? `no-reply <gemtunde@gmail.com>`
//     : `no-reply <${config.MAILER_SENDER}>`;

// export const sendEmail = async ({
//   to,
//   from = mailer_sender,
//   subject,
//   text,
//   html,
// }: Params) =>
//   await resend.emails.send({
//     from,
//     to: Array.isArray(to) ? to : [to],
//     text,
//     subject,
//     html,
//   });

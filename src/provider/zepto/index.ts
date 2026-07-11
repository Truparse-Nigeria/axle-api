import { ENVIRONMENT, IS_DEVELOPMENT, logger, type ISendMail } from "@/common";
import nodemailer from "nodemailer";
import { SendMailClient } from "zeptomail";

const transporter = nodemailer.createTransport({
  host: ENVIRONMENT.ZEPTO.SERVICE,
  port: !IS_DEVELOPMENT ? 465 : 587,
  secure: !IS_DEVELOPMENT,
  auth: {
    user: ENVIRONMENT.ZEPTO.USERNAME,
    pass: ENVIRONMENT.ZEPTO.PASSWORD,
  },
});

export const sendEmail = async ({
  to,
  subject,
  template,
}: ISendMail) => {
  const url = "https://api.zeptomail.com/v1.1/email";
  const token =
    "Zoho-enczapikey wSsVR61z+kOhC6p5yGGpJO9pmQ8DBwn2Rx4r0Vug6nWoF/nG98cylxacDASlHfVNF2RpRTRGpL4qyR8HhjZcitQqm1tTDCiF9mqRe1U4J3x17qnvhDzMXGxfkBuBLIgBzw9smWBhE89u";

  let client = new SendMailClient({ url, token });

  client
    .sendMail({
      from: {
        address: "noreply@paycrib.io",
        name: "noreply",
      },
      to: [
        {
          email_address: {
            address: to,
            name: "PayCrib",
          },
        },
      ],
      subject,
      htmlbody: template,
    })
    .then((resp) => console.log("success"))
    .catch((error) => console.log("error"));
};

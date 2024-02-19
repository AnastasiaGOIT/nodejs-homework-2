const sendEmail = (data) => {
  const email = { ...data, from: "App admin <example@mail.ua>" };
  return transport.sendMail(email);
};

module.exports = sendEmail;

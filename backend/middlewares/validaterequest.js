// middleware/validateRequest.js
export const validateLocation = (req, res, next) => {
  if (!req.body.location) {
    return res.status(400).json({ message: "Location is required." });
  }
  next();
};

export const validateInterests = (req, res, next) => {
  if (!req.body.interests || !Array.isArray(req.body.interests)) {
    return res.status(400).json({ message: "Interests must be an array." });
  }
  next();
};

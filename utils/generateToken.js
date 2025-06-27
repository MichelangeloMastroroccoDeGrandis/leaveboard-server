import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId) => {
  let token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  return token;
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
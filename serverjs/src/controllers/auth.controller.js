const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../utils/email");
const winston = require("winston");

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "1d",
  });
};

exports.register = async (req, res) => {
  const { email, password, name, phone, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email đã được sử dụng" });

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{6,})/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải chứa ít nhất 6 ký tự, bao gồm 1 ký tự in hoa và 1 ký tự đặc biệt",
      });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const user = new User({
      email,
      password,
      name,
      phone,
      role,
      verificationCode,
    });

    await user.save();
    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({
      message: "Đăng ký thành công, vui lòng kiểm tra email để xác thực",
    });
  } catch (error) {
    res.status(500).json({ message: "Có lỗi xảy ra", error: error.message });
  }
};

exports.login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;
  const user = await User.findOne({ $or: [{ email }, { phone }] }).select(
    "+password"
  );

  if (!user) {
    return res
      .status(401)
      .json({ message: "Email, số điện thoại hoặc mật khẩu không chính xác" });
  }

  if (!user.verified) {
    return res.status(403).json({ message: "Tài khoản chưa được xác thực" });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ message: "Email, số điện thoại hoặc mật khẩu không chính xác" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });

  res.status(200).json({
    message: "Đăng nhập thành công",
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      phone: user.phone,
      address: user.address,
    },
  });

  console.log("Đăng nhập thành công. Token:", accessToken);
  winston.info(`Người dùng ${user.email} đã đăng nhập từ IP: ${req.ip}`);
});

exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  const admin = await User.findOne({
    $or: [{ email }, { phone }],
    role: "admin",
  }).select("+password");

  if (!admin) {
    return res.status(401).json({
      message: "Email, số điện thoại hoặc mật khẩu không chính xác",
    });
  }

  if (!admin.verified) {
    return res.status(403).json({ message: "Tài khoản chưa được xác thực" });
  }

  const isMatch = await admin.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      message: "Email, số điện thoại hoặc mật khẩu không chính xác",
    });
  }

  const accessToken = generateAccessToken(admin);
  const refreshToken = generateRefreshToken(admin);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    message: "Đăng nhập admin thành công",
    accessToken,
    user: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      balance: admin.balance,
      phone: admin.phone,
      address: admin.address,
    },
  });

  winston.info(`Admin ${admin.email} đã đăng nhập từ IP: ${req.ip}`);
});

exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn" });
  }
};

exports.logout = asyncHandler((req, res) => {
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Đăng xuất thành công" });
  winston.info(`Người dùng đã đăng xuất từ IP: ${req.ip}`);
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const { verificationCode, email } = req.body;

  const user = await User.findOne({ email, verificationCode });

  if (!user) {
    return res
      .status(404)
      .json({ message: "Mã xác thực hoặc email không hợp lệ." });
  }

  user.verified = true;
  user.verificationCode = undefined;
  await user.save();

  winston.info(`Xác thực email thành công cho người dùng: ${user.email}`);
  res.status(200).json({ message: "Xác thực thành công" });
});

exports.resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "Người dùng không tồn tại." });
  }

  const newVerificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  user.verificationCode = newVerificationCode;
  await user.save();

  await sendVerificationEmail(email, newVerificationCode);

  res
    .status(200)
    .json({ message: "Mã xác thực mới đã được gửi đến email của bạn." });
};

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "Email không tồn tại" });
  }

  if (!user.verified) {
    return res.status(400).json({ message: "Tài khoản chưa được xác thực" });
  }

  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  user.verificationCode = verificationCode;
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();
  await sendResetPasswordEmail(email, verificationCode);

  winston.info(`Gửi mã khôi phục mật khẩu cho người dùng: ${email}`);
  res
    .status(200)
    .json({ message: "Vui lòng kiểm tra email để đặt lại mật khẩu" });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { verificationCode, password } = req.body;
  const user = await User.findOne({
    verificationCode,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res
      .status(400)
      .json({ message: "Mã khôi phục mật khẩu không hợp lệ hoặc đã hết hạn" });
  }

  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  user.password = await bcrypt.hash(password, salt);
  user.verificationCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  winston.info(`Người dùng ${user.email} đã đặt lại mật khẩu thành công`);
  res.status(200).json({ message: "Đặt lại mật khẩu thành công" });
});

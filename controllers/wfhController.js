import WfhRequest from '../models/WfhRequest.js'; // Importing WfhRequest schema from models 
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import { startOfWeek, endOfWeek, isWithinInterval, addWeeks, parseISO } from 'date-fns';

export const requestWfh = async (req, res) => {

  // Nodemailer is used to send emails, it is compose of 3 steps: 
  //    1. nodemailer.createTransport() for connection
  //    2. mailOptions object for content of email
  //    3. transporter.sendMail() to send email

  try {

    // Extracting type and date from request body and user from request object
    const { type, date } = req.body;
    const user = req.user;

    // Validate date is within the next week
    const selectedDate = parseISO(date); // parseISO convert date string to Date object


    if (selectedDate.getDay() === 5) { 
      return res.status(400).json({ message: 'WFH requests on Fridays are not allowed.' });
    }
    if (selectedDate.getDay() === 6 || selectedDate.getDay() === 0) { 
      return res.status(400).json({ message: 'WFH requests on Weekend are not allowed.' });
    }
    const today = new Date();
    const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }); // startOfWeek gets the start of the week for a given date, addWeeks adds 1 week to today
    const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }); // endOfWeek gets the end of the week for a given date, addWeeks adds 1 week to today

    // Week Constraint
    // isWithinInterval checks if the date is within a specified interval, if not within the next week, return error
    if (!isWithinInterval(selectedDate, { start: nextWeekStart, end: nextWeekEnd })) { 
      return res.status(400).json({ message: 'You can only request WFH for next week.' });
    }

    // WFH Limit Per Week
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

    const userRequests = await WfhRequest.find({
      user: user._id,
      date: { $gte: weekStart, $lte: weekEnd },
      type: 'wfh',
    });

    const maxDays = user.wfhWeekly || 1; // Define max WFH days per week based on position, if position is CTO, CEO or COO, max days is 2, otherwise it is 1
    if (userRequests.length >= maxDays) {
      return res.status(400).json({ message: `You can request up to ${maxDays} WFH day(s) per week.` });
    }

    // Colleague Conflict
    const conflict = await WfhRequest.findOne({
      date,
      type: 'wfh',
      status: 'approved',
    }).populate('user');

    if (conflict && conflict.user.position === user.position) {
      return res.status(400).json({ message: `Colleague ${conflict.user.name} already has WFH on this date.` });
    }

    // Save Request (pending by default)
    const newRequest = await WfhRequest.create({
      user: user._id,
      type,
      date,
      status: 'pending'
    });

    // Send Email to Admin/Approver (next step)
    // Fetch all Admins and Approvers
const approvers = await User.find({ role: { $in: ['admin', 'approver'] } });

let recipients = [];

if (user.role === 'approver') {
  // If requester is an approver, notify admins
  recipients = await User.find({ role: 'admin' });
} else {
  // Otherwise, notify approvers
  recipients = await User.find({ role: 'approver' });
}

// 1. Transporter is an object that manages the connection and communication with an SMTP server
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 2. mailOptions defines the email content, forEach() iterates over each approver (approver & admin) to send the email
recipients.forEach((recipient) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipient.email,
    subject: `New WFH Request from ${user.name}`,
    text: `${user.name} has requested ${type.toUpperCase()} for ${date}. Please review it in the approval page.`,
  };

// 3. Send email to each approver
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error('Error sending email:', error);
    else console.log('Email sent:', info.response);
  });
});

    return res.status(201).json({ message: 'Request submitted successfully.', request: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error submitting WFH request' });
  }
};

// Return all pending WFH requests
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await WfhRequest.find({ status: 'pending' }).populate('user', 'name email position');
    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Find WFH by ID and set status to approved, save and return success message
export const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Populate user so we have access to their email
    const request = await WfhRequest.findById(id).populate('user');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'approved';
    await request.save();

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ Now request.user.email is defined
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: request.user.email,
      subject: 'Your WFH request has been approved',
      text: `Hi ${request.user.name}, your WFH request for ${request.date} has been approved.`,
    });

    res.json({ message: 'Request approved', request });
  } catch (error) {
    console.error("❌ Error approving request:", error);
    res.status(500).json({ message: 'Failed to approve request' });
  }
};

// Find WFH by ID and set status to rejected, save and send email to user
export const rejectRequest = async (req, res) => {
  const { reason } = req.body; // Extract reason from request body

  try {
    const request = await WfhRequest.findById(req.params.id).populate('user');  // Find WFH request by ID and populate user details

    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected'; // Set request status to rejected
    await request.save(); // Save the updated request

    // Send rejection email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: request.user.email,
      subject: 'Your WFH request has been rejected',
      text: `Hi ${request.user.name}, your WFH request for ${request.date} has been rejected.\n\nReason: ${reason || 'No reason provided'}`,
    });

    res.status(200).json({ message: 'Request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to reject request' });
  }
};

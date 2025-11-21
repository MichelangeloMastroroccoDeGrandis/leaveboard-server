import WfhRequest from '../models/WfhRequest.js'; // Importing WfhRequest schema from models 
import User from '../models/User.js';
import Holiday from '../models/Holiday.js';
import WfhSettings from '../models/WfhSettings.js';
import nodemailer from 'nodemailer';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, addWeeks, parseISO } from 'date-fns';

export const requestWfh = async (req, res) => {

  // Nodemailer is used to send emails, it is compose of 3 steps: 
  //    1. nodemailer.createTransport() for connection
  //    2. mailOptions object for content of email
  //    3. transporter.sendMail() to send email

  try {

    // Extracting type and date from request body and user from request object
    const { type, date, userId, allowAnyDate } = req.body;
    const actor = req.user;

    // Determine the target user: default to the requester; allow admin/approver to specify userId
    let user = actor;
    if (userId && ['admin', 'approver'].includes(actor.role)) {
      const maybeUser = await User.findById(userId);
      if (!maybeUser) {
        return res.status(404).json({ message: 'Target user not found' });
      }
      user = maybeUser;
    }

    // Validate date against dynamic WFH settings
    const selectedDate = parseISO(date); // parseISO convert date string to Date object

    const settings = await WfhSettings.findOne() || new WfhSettings();

    const today = new Date();
    const intervals = [];

    const scopes = settings.allowedDateScopes || {};

    // This week
    if (scopes.thisWeek) {
      intervals.push({
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      });
    }

    // Next week
    if (scopes.nextWeek) {
      const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
      const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
      intervals.push({ start: nextWeekStart, end: nextWeekEnd });
    }

    // Within current month
    if (scopes.withinMonth) {
      intervals.push({
        start: startOfMonth(today),
        end: endOfMonth(today),
      });
    }

    // Backwards compatibility: if no scopes configured and allowAnyDate is not set, fallback to original next-week-only rule
    if (!allowAnyDate) {
      if (intervals.length === 0) {
        const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
        if (!isWithinInterval(selectedDate, { start: nextWeekStart, end: nextWeekEnd })) {
          return res.status(400).json({ message: 'You can only request WFH for next week.' });
        }
      } else {
        const inAnyInterval = intervals.some(({ start, end }) =>
          isWithinInterval(selectedDate, { start, end })
        );
        if (!inAnyInterval) {
          return res.status(400).json({ message: 'Selected date is outside the allowed WFH date range.' });
        }
      }
    }

    // Weekday disallow rules
    const disallowedWeekdays = settings.disallowedWeekdays && settings.disallowedWeekdays.length
      ? settings.disallowedWeekdays
      : [1, 5, 0, 6]; // default: Monday, Friday, weekend

    if (disallowedWeekdays.includes(selectedDate.getDay())) {
      return res.status(400).json({ message: 'WFH requests on this weekday are not allowed.' });
    }

    // WFH Limit Per Week (adjusted by number of holidays in the same week)
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

    const userRequests = await WfhRequest.find({
      user: user._id,
      date: { $gte: weekStart, $lte: weekEnd },
      type: 'wfh',
    });

    // Count holidays in the same week as the requested date
    const holidaysInWeek = await Holiday.countDocuments({
      date: { $gte: weekStart, $lte: weekEnd },
    });

    const baseMaxDays = user.wfhWeekly || 1;
    const effectiveMaxDays = Math.max(0, baseMaxDays - holidaysInWeek);

    if (effectiveMaxDays <= 0) {
      const message = holidaysInWeek > 0
        ? 'No WFH allowed this week because of public holidays.'
        : `No WFH allowed this week. Your weekly allowance is ${baseMaxDays} day(s), already used.`;
      return res.status(400).json({ message });
    }

    if (userRequests.length >= effectiveMaxDays) {
      const message = holidaysInWeek > 0
        ? `You can request up to ${effectiveMaxDays} WFH day(s) this week due to public holidays.`
        : `You can request up to ${effectiveMaxDays} WFH day(s) per week.`;
      return res.status(400).json({ message });
    }

    // Colleague Conflict with per-position concurrency limit
    const concurrentApproved = await WfhRequest.find({
      date,
      type: 'wfh',
      status: 'approved',
    }).populate('user');

    const samePositionCount = concurrentApproved.filter((reqDoc) =>
      reqDoc.user && reqDoc.user.position === user.position
    ).length;

    const positionConcurrencyMap = settings.positionConcurrency || new Map();
    const allowedForPosition = positionConcurrencyMap.get
      ? (positionConcurrencyMap.get(user.position) ?? 1)
      : (positionConcurrencyMap[user.position] ?? 1);

    if (samePositionCount >= allowedForPosition) {
      return res.status(400).json({
        message: `There are already ${samePositionCount} colleague(s) with position ${user.position} working from home on this date. Maximum allowed is ${allowedForPosition}.`,
      });
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
const approvers = await User.find({ role: { $in: ['approver'] } });
const admins = await User.find({ role: 'admin' });
// If the actor is an approver, notify admins; otherwise notify approvers
const recipients = actor.role === 'approver' ? admins : approvers;

let transporter;

// 1. Transporter is an object that manages the connection and communication with an SMTP server
if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging') {
  transporter = nodemailer.createTransport({
  service: 'Gmail',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },tls: {
    rejectUnauthorized: false, // <-- allow self-signed
  }
});
} else if(process.env.NODE_ENV === 'production') {
transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});
}

// 2. mailOptions defines the email content, forEach() iterates over each approver (approver & admin) to send the email
recipients.forEach((recipient) => {
  const APP_URL = process.env.FRONTEND_URL || process.env.VITE_BASE_URL || 'http://localhost:7091';
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipient.email,
    subject: `New WFH Request from ${user.name}`,
    text: `${user.name} has requested ${type.toUpperCase()} for ${date}.\n\nPlease review it in the approval page:\n${APP_URL}`,
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
    const requests = await WfhRequest.find({ status: 'pending' }).populate('user', 'name email position role');
    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Return all approved WFH requests
export const getApprovedRequests = async (req, res) => {
  try {
    const requests = await WfhRequest.find({ status: 'approved' })
      .populate('user', 'name email position role');
    res.status(200).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch approved requests' });
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

    // request.status = 'rejected'; // Set request status to rejected UNCOMMENT IF YOU WANT TO SAVE STATUS IN FUTURE
    //await request.save(); // Save the updated request UNCOMMENT IF YOU WANT TO SAVE STATUS IN FUTURE

    await request.deleteOne();

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

//Delete WFH request by ID (Admin Only)
export const deleteRequest = async (req, res) => {
  try {
    const request = await WfhRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await request.deleteOne();
    res.json({ message: 'Request deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ message: 'Failed to delete request' });
  }
};

// Update the date of a WFH request
export const updateRequestDate = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const request = await WfhRequest.findById(req.params.id).populate('user');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const oldDate = request.date;
    request.date = date;
    await request.save();

    // Notify user about the date change
    try {
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const formatDate = (d) => {
        try {
          return new Date(d).toISOString().slice(0, 10);
        } catch {
          return String(d);
        }
      };

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: request.user.email,
        subject: 'Your WFH request date has been updated',
        text: `Hi ${request.user.name}, your approved WFH request has been updated.\n\nOld date: ${formatDate(oldDate)}\nNew date: ${formatDate(request.date)}.`,
      });
    } catch (mailErr) {
      console.error('Error sending WFH date change email:', mailErr);
      // Do not fail the API call if email sending fails
    }

    res.json(request);
  } catch (err) {
    console.error('Error updating date:', err);
    res.status(500).json({ message: 'Failed to update date' });
  }
};
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
 
export const signup = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
	sendError(res, StatusCodes.BAD_REQUEST, 'name, email, password are required'); return;
  }
  if (role && !['contributor', 'maintainer'].includes(role)) {
	sendError(res, StatusCodes.BAD_REQUEST, 'Role must be contributor or maintainer'); return;
  }
  try {
	const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
	if (existing.rows.length > 0) {
  	sendError(res, StatusCodes.BAD_REQUEST, 'Email already in use'); return;
	}
	const hashedPassword = await bcrypt.hash(password, 10);
	const result = await pool.query(
  	`INSERT INTO users (name, email, password, role)
   	VALUES ($1, $2, $3, $4)
   	RETURNING id, name, email, role, created_at, updated_at`,
  	[name, email, hashedPassword, role || 'contributor']
	);
	sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', result.rows[0]);
  } catch (err) {
	sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', err);
  }
};
 
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
	sendError(res, StatusCodes.BAD_REQUEST, 'email and password required'); return;
  }
  try {
	const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
	const user = result.rows[0];
	if (!user) { sendError(res, StatusCodes.BAD_REQUEST, 'Invalid credentials'); return; }
	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) { sendError(res, StatusCodes.BAD_REQUEST, 'Invalid credentials'); return; }
	const token = jwt.sign(
  	{ id: user.id, name: user.name, role: user.role },
  	process.env.JWT_SECRET as string,
  	{ expiresIn: '7d' }
	);
	const { password: _, ...userWithoutPassword } = user;
	sendSuccess(res, StatusCodes.OK, 'Login successful', { token, user: userWithoutPassword });
  } catch (err) {
	sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', err);
  }
};

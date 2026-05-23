import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
 
const getReporter = async (id: number) => {
  const r = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [id]);
  return r.rows[0] || null;
};
 
// POST /api/issues
export const createIssue = async (req: Request, res: Response): Promise<void> => {
  const { title, description, type } = req.body;
  const reporter_id = req.user!.id;
  if (!title || !description || !type) {
	sendError(res, StatusCodes.BAD_REQUEST, 'title, description, type required'); return;
  }
  if (title.length > 150) { sendError(res, StatusCodes.BAD_REQUEST, 'title max 150 chars'); return; }
  if (description.length < 20) { sendError(res, StatusCodes.BAD_REQUEST, 'description min 20 chars'); return; }
  if (!['bug','feature_request'].includes(type)) {
	sendError(res, StatusCodes.BAD_REQUEST, 'type must be bug or feature_request'); return;
  }
  try {
	const result = await pool.query(
  	`INSERT INTO issues (title, description, type, reporter_id)
   	VALUES ($1, $2, $3, $4) RETURNING *`,
  	[title, description, type, reporter_id]
	);
	sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
  } catch (err) { sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', err); }
};
 
// GET /api/issues
export const getAllIssues = async (req: Request, res: Response): Promise<void> => {
  const { sort = 'newest', type, status } = req.query;
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (type) { values.push(type); conditions.push(`type = $${values.length}`); }
  if (status) { values.push(status); conditions.push(`status = $${values.length}`); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = sort === 'oldest' ? 'ASC' : 'DESC';
  try {
	const result = await pool.query(`SELECT * FROM issues ${where} ORDER BY created_at ${order}`, values);
	const ids = [...new Set(result.rows.map((i: {reporter_id:number}) => i.reporter_id))];
	let reporters: Record<number, {id:number;name:string;role:string}> = {};
	if (ids.length > 0) {
  	const ph = ids.map((_,i) => `$${i+1}`).join(',');
  	const ur = await pool.query(`SELECT id, name, role FROM users WHERE id IN (${ph})`, ids);
      ur.rows.forEach((u:{id:number;name:string;role:string}) => { reporters[u.id] = u; });
	}
	const issues = result.rows.map((iss: Record<string,unknown>) => ({
  	...iss, reporter: reporters[iss.reporter_id as number] || null
	}));
	sendSuccess(res, StatusCodes.OK, 'Issues fetched', issues);
  } catch (err) { sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', err); }
};
 
// GET /api/issues/:id
export const getIssue = async (req: Request, res: Response): Promise<void> => {
  try {
	const r = await pool.query('SELECT * FROM issues WHERE id = $1', [req.params.id]);
	if (r.rows.length === 0) { sendError(res, StatusCodes.NOT_FOUND, 'Issue not found'); return; }
	const reporter = await getReporter(r.rows[0].reporter_id);
	sendSuccess(res, StatusCodes.OK, 'Issue fetched', { ...r.rows[0], reporter });
  } catch (err) { sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', err); }
};
 
// PATCH /api/issues/:id
export const updateIssue = async (req: Request, res: Response): Promise<void> => {
  const { title, description, type, status } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.role;
  try {
	const r = await pool.query('SELECT * FROM issues WHERE id = $1', [req.params.id]);
	if (r.rows.length === 0) { sendError(res, StatusCodes.NOT_FOUND, 'Issue not found'); return; }
	const issue = r.rows[0];
	if (userRole === 'contributor') {
  	if (issue.reporter_id !== userId) { sendError(res, StatusCodes.FORBIDDEN, 'Not your issue'); return; }
  	if (issue.status !== 'open') { sendError(res, StatusCodes.CONFLICT, 'Issue is not open'); return; }
  	if (status) { sendError(res, StatusCodes.FORBIDDEN, 'Cannot change status'); return; }
	}
	const fields: string[] = []; const vals: unknown[] = [];
	if (title) { vals.push(title); fields.push(`title = $${vals.length}`); }
	if (description) { vals.push(description); fields.push(`description = $${vals.length}`); }
	if (type) { vals.push(type); fields.push(`type = $${vals.length}`); }
	if (status && userRole === 'maintainer') { vals.push(status); fields.push(`status = $${vals.length}`); }
	if (fields.length === 0) { sendError(res, StatusCodes.BAD_REQUEST, 'Nothing to update'); return; }
	vals.push(req.params.id);
	const updated = await pool.query(
  	`UPDATE issues SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`, vals
	);
	sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', updated.rows[0]);
  } catch (err) { sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', err); }
};
 
// DELETE /api/issues/:id
export const deleteIssue = async (req: Request, res: Response): Promise<void> => {
  try {
	const r = await pool.query('SELECT id FROM issues WHERE id = $1', [req.params.id]);
	if (r.rows.length === 0) { sendError(res, StatusCodes.NOT_FOUND, 'Issue not found'); return; }
	await pool.query('DELETE FROM issues WHERE id = $1', [req.params.id]);
	sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully', undefined);
  } catch (err) { sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Server error', err); }
};

 
 


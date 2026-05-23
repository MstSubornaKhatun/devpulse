import { Router } from 'express';
import { authenticate, requireMaintainer } from '../../middleware/auth';
import { createIssue, getAllIssues, getIssue, updateIssue, deleteIssue } from './issues.controller';
 
const router = Router();
router.post('/', authenticate, createIssue);
router.get('/', getAllIssues);
router.get('/:id', getIssue);
router.patch('/:id', authenticate, updateIssue);
router.delete('/:id', authenticate, requireMaintainer, deleteIssue);
export default router;
import express from 'express';
import { getAllLeads, getLeadById } from '../db'; // 复用现有的数据库函数

export const restApi = express.Router();

// 1. 获取所有客户的REST API
restApi.get('/customers', async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. 根据ID获取单个客户的REST API
restApi.get('/customers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const lead = await getLeadById(id);
    if (lead) {
      res.json(lead);
    } else {
      res.status(404).json({ error: 'Lead not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

import { parseISO, addDays } from 'date-fns';
import { Op } from 'sequelize';
import * as Yup from 'yup';
import Meetup from '../models/Meetup';
import File from '../models/File';
import User from '../models/User';

class MeetupController {
  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required('the title is required'),
      description: Yup.string().required('description is required'),
      location: Yup.string().required('the location is required'),
      date: Yup.date()
        .min(new Date(), 'only future dates are available.')
        .required('please, inform a date'),
      banner_id: Yup.number().required(),
    });

    try {
      await schema.validate(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.errors });
    }

    const user_id = req.userId;

    const { title, description, location, date, banner_id } = req.body;

    const meetup = await Meetup.create({
      banner_id,
      user_id,
      title,
      description,
      location,
      date,
    });

    return res.json(
      await Meetup.findOne({
        where: { id: meetup.id },
        include: [
          {
            model: File,
            as: 'Banner',
            attributes: ['path', 'name', 'url', 'id'],
          },
          { model: User, attributes: ['name', 'email'] },
        ],
      })
    );
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      location: Yup.string(),
      date: Yup.date().min(new Date(), 'only future dates are available.'),
      banner_id: Yup.number(),
    });

    try {
      await schema.validate(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.errors });
    }

    const { id } = req.body;
    const user_id = req.userId;

    const meetup = await Meetup.findOne({
      where: { id, user_id },
      include: [
        {
          model: File,
          as: 'Banner',
          attributes: ['path', 'name', 'url', 'id'],
        },
        { model: User, attributes: ['name', 'email'] },
      ],
    });

    if (!meetup)
      return res.status(404).json({ error: 'meetup not found for this user' });

    if (meetup.date.getTime() < new Date().getTime())
      return res
        .status(400)
        .json({ error: 'you can only edit future meetups' });

    await meetup.update({ ...req.body, user_id: undefined });

    return res.json(
      await Meetup.findByPk(id, {
        include: [
          {
            model: File,
            as: 'Banner',
            attributes: ['path', 'name', 'url', 'id'],
          },
          { model: User, attributes: ['name', 'email'] },
        ],
      })
    );
  }

  async index(req, res) {
    const schema = Yup.object().shape({
      date: Yup.date().required(
        'date parameter is required with YYYY-DD-MM format'
      ),
      page: Yup.number()
        .min(1)
        .required('page parameter is required'),
    });

    const { date: strDate, page: inPage } = req.query;
    const pageSize = 10;

    const date = parseISO(strDate, 'YYYY-DD-MM');
    const page = inPage - 1;

    try {
      await schema.validate({ ...req.query, date });
    } catch (error) {
      return res.status(400).json({ error: error.errors });
    }

    const offset = page * pageSize;
    const limit = offset + pageSize;

    return res.json(
      await Meetup.findAll({
        where: {
          date: {
            [Op.between]: [date, addDays(date, 1)],
          },
        },
        offset,
        limit,
        include: [
          { model: File, as: 'Banner', attributes: ['path', 'name', 'url'] },
          { model: User, attributes: ['name', 'email'] },
        ],
      })
    );
  }

  async delete(req, res) {
    const { id } = req.params;
    const user_id = req.userId;

    const meetup = await Meetup.findByPk(id);

    if (!meetup) return res.status(404).json({ error: 'meetup not found' });

    if (meetup.user_id !== user_id)
      return res.status(404).json({ error: 'meetup not found for this user' });

    if (meetup.past)
      return res
        .status(400)
        .json({ error: 'you can only remove future meetups' });

    await meetup.destroy();

    return res.json();
  }
}

export default new MeetupController();

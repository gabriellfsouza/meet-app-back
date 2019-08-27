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
          { model: File, as: 'banner', attributes: ['path', 'name', 'url'] },
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
        { model: File, as: 'banner', attributes: ['path', 'name', 'url'] },
        { model: User, attributes: ['name', 'email'] },
      ],
    });

    if (!meetup)
      return res.status(404).json({ error: 'meetup not found for this user' });

    if (meetup.date.getTime() < new Date().getTime())
      return res
        .status(400)
        .json({ error: 'you can only edit future meetups' });

    return res.json(await meetup.update({ ...req.body, user_id: undefined }));
  }

  async index(req, res) {
    const user_id = req.userId;

    return res.json(
      await Meetup.findAll({
        where: { user_id },
        include: [
          { model: File, as: 'banner', attributes: ['path', 'name', 'url'] },
          { model: User, attributes: ['name', 'email'] },
        ],
      })
    );
  }

  async delete(req, res) {
    const { id } = req.params;
    const user_id = req.userId;

    const meetup = await Meetup.findOne({ where: { id, user_id } });

    if (!meetup)
      return res.status(404).json({ error: 'meetup not found for this user' });

    if (meetup.date.getTime() < new Date().getTime())
      return res
        .status(400)
        .json({ error: 'you can only remove future meetups' });

    return res.json(await meetup.destroy());
  }
}

export default new MeetupController();

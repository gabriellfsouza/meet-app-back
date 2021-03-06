import * as Yup from 'yup';
import { Op } from 'sequelize';

import Subscription from '../models/Subscription';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

import Queue from '../../lib/Queue';
import SubscriptionMail from '../jobs/SubscriptionMail';

class SubscriptionController {
  async store(req, res) {
    const schema = Yup.object().shape({
      meetup_id: Yup.number().required(
        'inform what meetup do you and to subscribe'
      ),
    });

    try {
      await schema.validate(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.errors });
    }

    const { meetup_id } = req.body;
    const subscriber_id = req.userId;

    const meetup = await Meetup.findOne({
      where: {
        id: meetup_id,
        user_id: {
          [Op.ne]: subscriber_id,
        },
        date: {
          [Op.gte]: new Date(),
        },
      },
      include: [
        {
          model: Subscription,
          include: [{ model: Meetup }],
        },
        { model: File, as: 'Banner', attributes: ['id', 'url', 'name'] },
        {
          model: User,
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!meetup)
      return res.status(400).json({
        error: `you cant subscribe at this meetup, please, verify the following reasons:
        - this meetup exists?
        - this meetup was created by yourself?
        - this meetup just passed?
        - you're already subscribed at this meetup?`,
      });

    if (
      meetup.Subscriptions.find(
        subscription =>
          subscription.subscriber_id === subscriber_id &&
          !subscription.canceled_at
      )
    )
      return res.status(400).json({ error: `you're already subscribed` });

    if (
      await Subscription.findOne({
        where: {
          subscriber_id,
          canceled_at: {
            [Op.is]: null,
          },
        },
        include: [
          {
            model: Meetup,
            where: {
              date: meetup.date,
            },
          },
        ],
      })
    )
      return res.status(400).json({
        error: `you're already subscribed to another meetup at this time`,
      });

    const subscription = await Subscription.create({
      meetup_id,
      subscriber_id,
    });

    const subscriptionData = await Subscription.findOne({
      where: { id: subscription.id },
      include: [
        {
          model: Meetup,
          attributes: ['title', 'description', 'location', 'date'],
          include: [{ model: User, attributes: ['name', 'email'] }],
        },
        { model: User, as: 'Subscriber', attributes: ['name', 'email'] },
      ],
    });

    await Queue.add(SubscriptionMail.key, { subscriptionData });

    return res.json(
      await Meetup.findByPk(meetup.id, {
        include: [
          {
            model: Subscription,
            where: { subscriber_id, canceled_at: { [Op.is]: null } },
          },
          {
            model: File,
            as: 'Banner',
            attributes: ['path', 'name', 'url', 'id'],
          },
          {
            model: User,
            attributes: ['name', 'email', 'id'],
          },
        ],
      })
    );
  }

  async delete(req, res) {
    const { id } = req.params;
    const subscriber_id = req.userId;

    const subscription = await Subscription.findOne({
      where: {
        id,
        subscriber_id,
        canceled_at: {
          [Op.is]: null,
        },
      },
    });

    if (!subscription)
      return res.status(400).json({ error: 'subscription not found' });

    subscription.canceled_at = new Date();
    subscription.save();

    return res.status(200).send();
  }

  async index(req, res) {
    const subscriber_id = req.userId;
    const meetups = await Meetup.findAll({
      where: {
        date: {
          [Op.gte]: new Date(),
        },
      },
      include: [
        {
          model: Subscription,
          where: { subscriber_id, canceled_at: { [Op.is]: null } },
        },
        {
          model: File,
          as: 'Banner',
          attributes: ['path', 'name', 'url', 'id'],
        },
        {
          model: User,
          attributes: ['name', 'email', 'id'],
        },
      ],
      order: ['date'],
    });

    return res.json(meetups);
  }
}

export default new SubscriptionController();

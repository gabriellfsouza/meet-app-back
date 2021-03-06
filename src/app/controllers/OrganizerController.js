import Meetup from '../models/Meetup';
import File from '../models/File';
import User from '../models/User';

class OrganizerController {
  async index(req, res) {
    const user_id = req.userId;

    return res.json(
      await Meetup.findAll({
        where: { user_id },
        order: ['date'],
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
}

export default new OrganizerController();

import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Mail from '../../lib/Mail';

class SubscriptionMail {
  get key() {
    return 'SubscriptionMail';
  }

  async handle({ data }) {
    const { subscriptionData } = data;

    await Mail.sendMail({
      to: `${subscriptionData.Meetup.User.name} <${subscriptionData.Meetup.User.email}>`,
      subject: `Nova inscrição para o evento ${subscriptionData.Meetup.title}`,
      template: 'subscription',
      context: {
        name: subscriptionData.Meetup.User.name,
        title: subscriptionData.Meetup.title,
        date: format(
          parseISO(subscriptionData.Meetup.date),
          "dd 'de' MMMM', às 'H:mm'h'",
          {
            locale: ptBR,
          }
        ),
        subscriber: subscriptionData.Subscriber.name,
        email: subscriptionData.Subscriber.email,
      },
    });
  }
}

export default new SubscriptionMail();

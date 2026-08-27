using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;

namespace TradingPlatform.Api.Services;

// concrete IEmailSender that talks to an smtp server gmail here via mailkit
public class SmtpEmailSender : IEmailSender
{
    private readonly EmailSettings settings;

    // IOptions<EmailSettings> is how DI hands us the bound config section
    public SmtpEmailSender(IOptions<EmailSettings> options)
    {
        settings = options.Value;
    }

    public async Task SendAsync(string to, string subject, string body)
    {
        // mimemessage is the email itself headers plus body
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.From));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        // smtpclient is the connection that ships the message
        using var client = new SmtpClient();
        // gmail on 587 upgrades a plain connection to tls with startTLS
        await client.ConnectAsync(settings.Host, settings.Port, SecureSocketOptions.StartTls);
        // log in with the gmail address and the app password
        await client.AuthenticateAsync(settings.User, settings.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}

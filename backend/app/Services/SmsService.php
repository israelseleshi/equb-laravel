<?php

namespace App\Services;

use App\Models\SmsLog;

class SmsService
{
    protected ?string $provider;
    protected ?string $apiKey;
    protected ?string $senderId;

    public function __construct()
    {
        $this->provider = env('SMS_PROVIDER', 'log');
        $this->apiKey = env('SMS_API_KEY');
        $this->senderId = env('SMS_SENDER_ID', 'GojoEqub');
    }

    public function send(string $recipient, string $type, string $message): bool
    {
        match ($this->provider) {
            'africastalking' => $this->sendAfricasTalking($recipient, $message),
            'ethiotelecom' => $this->sendEthioTelecom($recipient, $message),
            default => $this->logSms($recipient, $type, $message),
        };

        SmsLog::create([
            'recipient' => $recipient,
            'type' => $type,
            'message' => $message,
        ]);

        return true;
    }

    public function sendOtp(string $phone, string $otp): bool
    {
        $message = "Your Gojo Equb verification code is: $otp. It expires in 10 minutes.";
        return $this->send($phone, 'otp', $message);
    }

    protected function logSms(string $recipient, string $type, string $message): void
    {
        logger("SMS [$type] to $recipient: $message");
    }

    protected function sendAfricasTalking(string $recipient, string $message): void
    {
        // TODO: Implement AfricasTalking integration
        $this->logSms($recipient, 'africastalking', $message);
    }

    protected function sendEthioTelecom(string $recipient, string $message): void
    {
        // TODO: Implement Ethio Telecom API integration
        $this->logSms($recipient, 'ethiotelecom', $message);
    }
}

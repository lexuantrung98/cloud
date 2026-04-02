using AccountService.DTOs;
using Microsoft.AspNetCore.Http;

namespace AccountService.Services
{
    public interface IAuthService
    {
        string Ping();
        LoginResponseDto Login(LoginRequestDto request);
        UserProfileDto GetProfile(Guid userId);
        void CreateAccount(Guid creatorId, string creatorRole, CreateAccountRequestDto request);
        IEnumerable<UserProfileDto> GetAccounts(Guid requesterId, string requesterRole, string roleFilter);
        void DeactivateAccount(Guid accountId);
        void ReactivateAccount(Guid accountId);
        void DeleteAccount(Guid accountId);
        ImportResultDto ImportAccounts(Guid creatorId, string creatorRole, IFormFile file);
        string ForgotPassword(ForgotPasswordRequestDto request);
        void ResetPassword(ResetPasswordRequestDto request);
    }
}
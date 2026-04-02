using AccountService.DTOs;
using AccountService.Services;
using AccountService.Entities;
using AccountService.Data;     
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System;
using System.Linq;

namespace AccountService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        
        private readonly AccountDbContext _context; 

        public AuthController(IAuthService authService, AccountDbContext context)
        {
            _authService = authService;
            _context = context;
        }

        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(_authService.Ping());
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequestDto request)
        {
            try
            {
                var response = _authService.Login(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetProfile()
        {
            try
            {
                var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
                var profile = _authService.GetProfile(userId);
                return Ok(profile);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("get-user/{userId}")]
        public IActionResult GetUserById(string userId)
        {
            try 
            {
                if (!Guid.TryParse(userId, out Guid uid)) return BadRequest("Invalid ID");

                var user = _context.Users.FirstOrDefault(u => u.Id == uid);
                
                if (user == null) return NotFound();

                return Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    role = user.Role,
                });
            }
            catch(Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("create-account")]
        public IActionResult CreateAccount([FromBody] CreateAccountRequestDto request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var roleClaim = User.FindFirst(ClaimTypes.Role) ?? User.FindFirst("role");
                
                if (userIdClaim == null || roleClaim == null) 
                    return Unauthorized(new { message = "Token error" });

                var userId = Guid.Parse(userIdClaim);
                var role = roleClaim.Value;
                
                _authService.CreateAccount(userId, role, request);
                return Ok(new { message = "Account created successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("accounts")]
        public IActionResult GetAccounts([FromQuery] string? role)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var roleClaim = User.FindFirst(ClaimTypes.Role) ?? User.FindFirst("role");
                
                if (userIdClaim == null || roleClaim == null) 
                    return Unauthorized(new { message = "Unauthorized" });

                var userId = Guid.Parse(userIdClaim);
                var currentRole = roleClaim.Value;

                if (currentRole != "Admin" && currentRole != "Staff")
                    return StatusCode(403, new { message = "Forbidden" });

                var accounts = _authService.GetAccounts(userId, currentRole, role ?? "").ToList();
                return Ok(accounts);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPut("deactivate/{id}")]
        public IActionResult DeactivateAccount(Guid id)
        {
            try
            {
                var roleClaim = User.FindFirst(ClaimTypes.Role) ?? User.FindFirst("role");
                if (roleClaim?.Value != "Admin") return StatusCode(403, new { message = "Admin only" });

                _authService.DeactivateAccount(id);
                return Ok(new { message = "Account deactivated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPut("reactivate/{id}")]
        public IActionResult ReactivateAccount(Guid id)
        {
            try
            {
                var roleClaim = User.FindFirst(ClaimTypes.Role) ?? User.FindFirst("role");
                if (roleClaim?.Value != "Admin") return StatusCode(403, new { message = "Admin only" });

                _authService.ReactivateAccount(id);
                return Ok(new { message = "Account reactivated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpDelete("accounts/{id}")]
        public IActionResult DeleteAccount(Guid id)
        {
            try
            {
                var roleClaim = User.FindFirst(ClaimTypes.Role) ?? User.FindFirst("role");
                if (roleClaim?.Value != "Admin") return StatusCode(403, new { message = "Admin only" });

                _authService.DeleteAccount(id);
                return Ok(new { message = "Account deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("import")]
        public IActionResult ImportAccounts(IFormFile file)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var roleClaim = User.FindFirst(ClaimTypes.Role) ?? User.FindFirst("role");
                
                if (userIdClaim == null || roleClaim == null) 
                    return Unauthorized();

                var userId = Guid.Parse(userIdClaim);
                var result = _authService.ImportAccounts(userId, roleClaim.Value, file);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("lecturers")]
        public IActionResult GetLecturers()
        {
            try
            {
                var lecturers = _context.Users
                    .Where(u => u.Role == "Lecturer" && u.IsActive)
                    .OrderBy(u => u.FullName)
                    .Select(u => new LecturerDto
                    {
                        Id = u.Id,
                        Email = u.Email,
                        FullName = u.FullName,
                        Code = u.Code ?? string.Empty
                    })
                    .ToList();

                return Ok(new { data = lecturers, message = "Lấy danh sách giảng viên thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword([FromBody] ForgotPasswordRequestDto request)
        {
            try
            {
                var code = _authService.ForgotPassword(request);
                return Ok(new { message = "Code generated", code = code });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequestDto request)
        {
            try
            {
                _authService.ResetPassword(request);
                return Ok(new { message = "Password reset successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }    
    }
}
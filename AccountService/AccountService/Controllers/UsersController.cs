using AccountService.Data;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace AccountService.Controllers
{
    /// <summary>
    /// Controller để cung cấp API cho các service khác (inter-service communication)
    /// </summary>
    [Route("api/users")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AccountDbContext _context;

        public UsersController(AccountDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy thông tin user theo mã sinh viên (Code)
        /// Endpoint: GET /api/users/code/{studentCode}
        /// </summary>
        [HttpGet("code/{studentCode}")]
        public IActionResult GetUserByCode(string studentCode)
        {
            var user = _context.Users.FirstOrDefault(u => u.Code == studentCode);
            
            if (user == null) 
                return NotFound(new { message = $"Không tìm thấy sinh viên với mã {studentCode}" });

            return Ok(new 
            {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                code = user.Code,
                role = user.Role,
                isActive = user.IsActive
            });
        }

        /// <summary>
        /// Lấy thông tin user theo Email
        /// Endpoint: GET /api/users/email/{email}
        /// </summary>
        [HttpGet("email/{email}")]
        public IActionResult GetUserByEmail(string email)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == email);
            
            if (user == null) 
                return NotFound(new { message = $"Không tìm thấy user với email {email}" });

            return Ok(new 
            {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                code = user.Code,
                role = user.Role,
                isActive = user.IsActive
            });
        }
    }
}

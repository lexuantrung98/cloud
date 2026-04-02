using AccountService.DTOs;
using AccountService.Entities;
using AccountService.Data;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using OfficeOpenXml;

namespace AccountService.Services
{
    public class AuthService : IAuthService
    {
        private readonly AccountDbContext _context;
        private readonly IConfiguration _configuration;
        
        private static Dictionary<string, string> _resetCodes = new Dictionary<string, string>();

        static AuthService()
        {
            ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;
        }

        public AuthService(AccountDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public string Ping() => "Pong";

        public LoginResponseDto Login(LoginRequestDto request)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);

            if (user == null || !user.IsActive)
            {
                throw new Exception("Invalid email or password");
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

            if (!isPasswordValid)
            {
                throw new Exception("Invalid email or password");
            }

            var token = GenerateJwtToken(user);

            return new LoginResponseDto
            {
                AccessToken = token,
                Role = user.Role,
                Id = user.Id.ToString(),
                Email = user.Email,
                FullName = user.FullName ?? "",
                Code = user.Code ?? ""  // Mã sinh viên/giảng viên
            };
        }

        public UserProfileDto GetProfile(Guid userId)
        {
            var user = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null) throw new Exception("User not found");

            return new UserProfileDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        public void CreateAccount(Guid creatorId, string creatorRole, CreateAccountRequestDto request)
        {
            if (_context.Users.Any(u => u.Email == request.Email))
            {
                throw new Exception($"Email '{request.Email}' already exists");
            }

            bool isAuthorized = false;

            switch (creatorRole)
            {
                case "Admin":
                    if (request.Role == "Staff" || request.Role == "HeadDepartment") isAuthorized = true;
                    break;

                case "Staff":
                    if (new[] { "Lecturer", "Student" }.Contains(request.Role))
                        isAuthorized = true;
                    break;

                default:
                    isAuthorized = false;
                    break;
            }

            if (!isAuthorized)
            {
                throw new Exception($"Role '{creatorRole}' is not allowed to create account with role '{request.Role}'");
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // If FullName is not provided, use the part before @ in email
            string fullName = string.IsNullOrWhiteSpace(request.FullName) 
                ? request.Email.Split('@')[0] 
                : request.FullName;

            // Auto-generate student code for Student role
            string code = request.Code ?? string.Empty;
            if (request.Role == "Student")
            {
                var studentCount = _context.Users.Count(u => u.Role == "Student");
                code = $"SV{(studentCount + 1):D6}"; // SV000001, SV000002...
            }

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                FullName = fullName,
                Code = code,  // Assign generated code
                Role = request.Role,
                IsActive = true,
                CreatedBy = creatorRole == "Staff" ? creatorId : null, // Staff tạo thì ghi ID, Admin tạo thì null
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null,
                PasswordHash = passwordHash
            };

            _context.Users.Add(newUser);
            _context.SaveChanges();
        }

        public IEnumerable<UserProfileDto> GetAccounts(Guid requesterId, string requesterRole, string roleFilter)
        {
            var query = _context.Users.AsQueryable();

            // Logic phân quyền xem accounts
            if (requesterRole == "Staff")
            {
                // Staff chỉ thấy:
                // 1. Chính tài khoản của mình (Id == requesterId)
                // 2. Các tài khoản do mình tạo (CreatedBy == requesterId)
                query = query.Where(u => u.Id == requesterId || u.CreatedBy == requesterId);
            }
            // Admin thấy tất cả, không cần filter

            // Filter theo role nếu có
            if (!string.IsNullOrEmpty(roleFilter) && roleFilter != "All")
            {
                query = query.Where(u => u.Role == roleFilter);
            }

            var users = query.OrderByDescending(u => u.CreatedAt).ToList();

            return users.Select(u => new UserProfileDto
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName ?? string.Empty,
                Code = u.Code,  // Student code (SV000001)
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            });
        }

        public void DeactivateAccount(Guid accountId)
        {
            var user = _context.Users.Find(accountId);
            if (user == null) throw new Exception("User not found");

            user.IsActive = false;
            _context.SaveChanges();
        }

        public void ReactivateAccount(Guid accountId)
        {
            var user = _context.Users.Find(accountId);
            if (user == null) throw new Exception("User not found");

            user.IsActive = true;
            _context.SaveChanges();
        }

        public void DeleteAccount(Guid accountId)
        {
            var user = _context.Users.Find(accountId);
            if (user == null) throw new Exception("User not found");

            _context.Users.Remove(user);
            _context.SaveChanges();
        }

        public ImportResultDto ImportAccounts(Guid creatorId, string creatorRole, IFormFile file)
        {
            var result = new ImportResultDto();

            if (file == null || file.Length == 0)
            {
                result.ErrorDetails.Add("File rỗng hoặc không tồn tại.");
                return result;
            }

            using (var stream = new MemoryStream())
            {
                file.CopyTo(stream);
                stream.Position = 0;

                using (var package = new ExcelPackage(stream))
                {
                    if (package.Workbook.Worksheets.Count == 0)
                    {
                         result.ErrorDetails.Add("File Excel không có Sheet nào.");
                         return result;
                    }

                    var worksheet = package.Workbook.Worksheets[0];
                    if (worksheet.Dimension == null)
                    {
                        result.ErrorDetails.Add("Sheet 1 không có dữ liệu.");
                        return result;
                    }

                    int rowCount = worksheet.Dimension.End.Row;

                    // Track existing codes to prevent duplicates
                    var existingStudentCodes = _context.Users
                        .Where(u => u.Role == "Student" && !string.IsNullOrEmpty(u.Code))
                        .Select(u => u.Code.ToUpper())
                        .ToList();
                    
                    var processedCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    var nextStudentNumber = _context.Users.Count(u => u.Role == "Student") + 1;

                    for (int row = 2; row <= rowCount; row++)
                    {
                        try
                        {
                            // A: FullName, B: Email, C: Role (No password - auto-generated)
                            var fullName = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                            var email = worksheet.Cells[row, 2].Value?.ToString()?.Trim();
                            var role = worksheet.Cells[row, 3].Value?.ToString()?.Trim();

                            if (string.IsNullOrEmpty(fullName) && string.IsNullOrEmpty(email) && string.IsNullOrEmpty(role))
                                continue;

                            if (string.IsNullOrEmpty(fullName) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(role))
                            {
                                result.ErrorCount++;
                                result.ErrorDetails.Add($"Dòng {row}: Thiếu thông tin (Họ tên, Email hoặc Role trống).");
                                continue;
                            }

                            if (_context.Users.Any(u => u.Email == email))
                            {
                                result.ErrorCount++;
                                result.ErrorDetails.Add($"Dòng {row}: Email '{email}' đã tồn tại.");
                                continue;
                            }

                            bool isAuthorized = false;
                            if (creatorRole == "Admin") isAuthorized = true;
                            else if (creatorRole == "Staff" && (role == "Student" || role == "Lecturer")) isAuthorized = true;

                            if (!isAuthorized)
                            {
                                result.ErrorCount++;
                                result.ErrorDetails.Add($"Dòng {row}: Bạn không có quyền tạo Role '{role}'.");
                                continue;
                            }

                            // Auto-generate password: 123456 (or use email prefix)
                            var autoPassword = "123456";

                            // Auto-generate student code for Student role
                            string code = string.Empty;
                            if (role == "Student")
                            {
                                // Generate unique code
                                string generatedCode;
                                do
                                {
                                    generatedCode = $"SV{nextStudentNumber:D6}";
                                    nextStudentNumber++;
                                } while (existingStudentCodes.Contains(generatedCode.ToUpper()) || 
                                         processedCodes.Contains(generatedCode));

                                code = generatedCode;
                                processedCodes.Add(code);
                                existingStudentCodes.Add(code.ToUpper());
                            }

                            var newUser = new User
                            {
                                Id = Guid.NewGuid(),
                                Email = email,
                                FullName = fullName,
                                Code = code,
                                Role = role,
                                IsActive = true,
                                CreatedBy = creatorRole == "Staff" ? creatorId : null, // Ghi người tạo
                                CreatedAt = DateTime.UtcNow,
                                PasswordHash = BCrypt.Net.BCrypt.HashPassword(autoPassword)
                            };

                            _context.Users.Add(newUser);
                            result.SuccessCount++;
                        }
                        catch (Exception ex)
                        {
                            result.ErrorCount++;
                            result.ErrorDetails.Add($"Dòng {row}: Lỗi hệ thống ({ex.Message}).");
                        }
                    }
                    _context.SaveChanges();
                }
            }

            return result;
        }

        public string ForgotPassword(ForgotPasswordRequestDto request)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);
            if (user == null) throw new Exception("Email không tồn tại trong hệ thống.");

            var code = new Random().Next(100000, 999999).ToString();
            
            if (_resetCodes.ContainsKey(request.Email))
            {
                _resetCodes[request.Email] = code;
            }
            else
            {
                _resetCodes.Add(request.Email, code);
            }

            return code; 
        }

        public void ResetPassword(ResetPasswordRequestDto request)
        {
            if (!_resetCodes.ContainsKey(request.Email) || _resetCodes[request.Email] != request.ResetCode)
            {
                throw new Exception("Mã xác nhận không đúng hoặc đã hết hạn.");
            }

            var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);
            if (user == null) throw new Exception("User không tồn tại.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            _context.SaveChanges();

            _resetCodes.Remove(request.Email);
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            // Add Code claim for students/lecturers (e.g., SV000007)
            if (!string.IsNullOrEmpty(user.Code))
            {
                claims.Add(new Claim("Code", user.Code));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(1),
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
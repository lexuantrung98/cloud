namespace AccountService.DTOs;

public class CreateAccountRequestDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string? FullName { get; set; }
    public string Role { get; set; } = null!;
    public string? Code { get; set; }  // Optional, auto-generated for Student
}

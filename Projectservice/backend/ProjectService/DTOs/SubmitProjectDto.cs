using Microsoft.AspNetCore.Http;

namespace ProjectService.DTOs;

public class SubmitProjectDto
{
    public Guid GroupId { get; set; }
    public string SubmissionUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IFormFile? File { get; set; }
}

namespace ProjectService.DTOs;

public class GradeSubmissionDto
{
    public Guid SubmissionId { get; set; }
    public double Score { get; set; }
    public string Feedback { get; set; } = string.Empty;
}

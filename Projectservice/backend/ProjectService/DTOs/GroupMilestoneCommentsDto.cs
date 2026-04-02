namespace ProjectService.DTOs
{
    public class AddCommentDto
    {
        public string Content { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
    }

    public class GradeMilestoneDto
    {
        public double Score { get; set; }
        public string? Feedback { get; set; }
        public string GraderName { get; set; } = string.Empty;
    }
}

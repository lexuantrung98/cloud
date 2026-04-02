namespace ProjectService.Models
{
    public class GroupMilestoneGrade
    {
        public string Id { get; set; } = string.Empty;
        public string GroupMilestoneId { get; set; } = string.Empty;
        
        // Who graded
        public string GradedBy { get; set; } = string.Empty;
        public string GraderName { get; set; } = string.Empty;
        public string GraderRole { get; set; } = string.Empty; // Student, Lecturer
        
        // Grade details
        public double Score { get; set; } // 0-10
        public string? Feedback { get; set; } // Optional
        
        public DateTime GradedAt { get; set; }
    }
}

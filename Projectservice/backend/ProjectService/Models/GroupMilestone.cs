using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace ProjectService.Models;

public class GroupMilestone
{
    public string Id { get; set; } = string.Empty;
    public string GroupId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? Deadline { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Assignment & Submission
    public string? AssignedTo { get; set; } // Student ID
    public string? SubmittedBy { get; set; } // Student ID who submitted
    public string? SubmissionContent { get; set; } // Link or description
    public string? SubmissionFilePath { get; set; } // File path if file uploaded
    public DateTime? SubmittedAt { get; set; }
    
    // Navigation properties removed temporarily due to serialization issues
    // Comments and Grades can still be queried separately via API
}

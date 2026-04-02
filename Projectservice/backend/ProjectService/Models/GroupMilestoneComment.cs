namespace ProjectService.Models
{
    public class GroupMilestoneComment
    {
        public string Id { get; set; } = string.Empty;
        public string GroupMilestoneId { get; set; } = string.Empty;
        
        // Who commented
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string UserRole { get; set; } = string.Empty;
        
        // Comment content
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}

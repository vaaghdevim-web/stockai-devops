# -----------------------------------------
# Load Balancer Security Group
# -----------------------------------------

resource "aws_security_group" "load_balancer" {
  name        = "stockai-load-balancer-sg"
  description = "Security group for StockAI Load Balancer"
  vpc_id      = aws_vpc.stockai_vpc.id

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "stockai-load-balancer-sg"
  }
}


# -----------------------------------------
# Backend Security Group
# -----------------------------------------

resource "aws_security_group" "backend" {
  name        = "stockai-backend-sg"
  description = "Security group for StockAI Backend"
  vpc_id      = aws_vpc.stockai_vpc.id

  egress {
    description = "Allow outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "stockai-backend-sg"
  }
}


# -----------------------------------------
# Database Security Group
# -----------------------------------------

resource "aws_security_group" "database" {
  name        = "stockai-database-sg"
  description = "Security group for StockAI PostgreSQL"
  vpc_id      = aws_vpc.stockai_vpc.id

  egress {
    description = "Allow outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "stockai-database-sg"
  }
}


# -----------------------------------------
# ALB → Backend
# -----------------------------------------

resource "aws_security_group_rule" "backend_from_load_balancer" {
  type                     = "ingress"
  security_group_id        = aws_security_group.backend.id
  source_security_group_id = aws_security_group.load_balancer.id

  from_port = 8000
  to_port   = 8000
  protocol  = "tcp"
}


# -----------------------------------------
# Backend → PostgreSQL
# -----------------------------------------

resource "aws_security_group_rule" "database_from_backend" {
  type                     = "ingress"
  security_group_id        = aws_security_group.database.id
  source_security_group_id = aws_security_group.backend.id

  from_port = 5432
  to_port   = 5432
  protocol  = "tcp"
}
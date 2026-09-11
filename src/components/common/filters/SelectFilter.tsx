"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SelectFilterProps {
  placeholder: string;
  options: string[];
  onValueChange: (newValue: string[]) => void;
  defaultValue?: string[];
}

const SelectFilter: React.FC<SelectFilterProps> = ({
  placeholder,
  options,
  onValueChange,
  defaultValue = [],
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (defaultValue.length > 0) {
      onValueChange(defaultValue);
    }
  }, []);

  const toggleItem = (option: string) => {
    const newSelectedItems = selectedItems.includes(option)
      ? selectedItems.filter((item) => item !== option)
      : [...selectedItems, option];
    setSelectedItems(newSelectedItems);
    onValueChange(newSelectedItems); // Propagate change up
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-8 min-w-[140px] justify-between font-normal"
        >
          <span className="text-muted-foreground truncate">{placeholder}</span>
          <span className="flex items-center gap-1">
            {selectedItems.length > 0 && (
              <Badge variant="secondary" className="px-1.5">
                {selectedItems.length}
              </Badge>
            )}
            <ChevronsUpDown className="text-muted-foreground h-4 w-4 shrink-0" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option, index) => (
                <CommandItem
                  key={index}
                  value={option}
                  onSelect={() => toggleItem(option)}
                >
                  <Checkbox
                    checked={selectedItems.includes(option)}
                    className="pointer-events-none"
                  />
                  <span className="truncate">{option}</span>
                  {selectedItems.includes(option) && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SelectFilter;
